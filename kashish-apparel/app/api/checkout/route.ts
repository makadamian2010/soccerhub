import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {database,sameOrigin} from '@/lib/server';
import {receiptCookie,stripeClient,tokenHash} from '@/lib/payments';
import {validateCart,validAttempt,validStripeCheckoutUrl} from '@/lib/checkout-validation.mjs';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid request.'},{status:403});
 let body;try{body=await req.json()}catch{return NextResponse.json({error:'Invalid checkout request.'},{status:400})}
 let items;try{items=validateCart(body.items);if(!validAttempt(body.attemptId))throw Error('Please refresh your bag and try checkout again.')}catch(e){return NextResponse.json({error:(e as Error).message},{status:400})}
 const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SITE_URL'];
 if(process.env.ENABLE_CHECKOUT==='false'||required.some(k=>!process.env[k]))return NextResponse.json({error:'Secure checkout is temporarily unavailable. Your bag is saved; contact Kashish Apparel on WhatsApp for assistance.',code:'CHECKOUT_NOT_CONFIGURED'},{status:503});
 let db:ReturnType<typeof database>|undefined,orderId:string|undefined;
 try{
  const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin;
  if(process.env.NODE_ENV==='production'&&!origin.startsWith('https://'))throw Error('Invalid site configuration');
  db=database();const stripe=stripeClient();let userId:string|null=null,email:string|undefined;
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(token){const {data,error}=await db.auth.getUser(token);if(error||!data.user)return NextResponse.json({error:'Your session has expired. Please sign in again.'},{status:401});userId=data.user.id;email=data.user.email}
  const {data:variants,error:readError}=await db.from('variants').select('id,price,active,products!inner(visible,deleted_at,collections)').in('id',items.map(i=>i.variant));if(readError)throw Error('Catalog unavailable');
  if(!variants||variants.length!==items.length||variants.some(v=>!v.active||!(v.products as any).visible||(v.products as any).deleted_at))return NextResponse.json({error:'One or more pieces are no longer available. Please update your bag.'},{status:409});
  const subtotal=items.reduce((s,i)=>s+variants.find(v=>v.id===i.variant)!.price*i.quantity,0);
  if(subtotal<20000&&!process.env.STRIPE_SHIPPING_RATE_ID)return NextResponse.json({error:'Shipping rates are temporarily unavailable. Please contact the store for help with this order.'},{status:503});
  const couponCode=typeof body.coupon==='string'?body.coupon.trim().toUpperCase():'';let coupon:any=null;
  if(couponCode){const {data,error}=await db.from('discounts').select('*').eq('code',couponCode).eq('active',true).single();if(error||!data||data.expires_at&&new Date(data.expires_at).getTime()<=Date.now())return NextResponse.json({error:'This coupon is invalid or has expired.'},{status:400});if(data.collection&&variants.some(v=>!(v.products as any).collections.includes(data.collection)))return NextResponse.json({error:'This coupon applies only when every piece in your bag belongs to its collection.'},{status:400});coupon=data;}
  const key=tokenHash(body.attemptId),signature=tokenHash(JSON.stringify({items,coupon:couponCode}));
  const {data:order,error}=await db.rpc('reserve_checkout',{p_items:items,p_user_id:userId,p_key:key,p_signature:signature});
  if(error)return NextResponse.json({error:error.message.includes('expired')?'Your checkout session has expired. Please try again.':'Your bag could not be reserved. An item may have sold out; please review your selection.',code:error.message.includes('expired')?'CHECKOUT_EXPIRED':'INVENTORY_UNAVAILABLE'},{status:409});
  orderId=order.id;
  if(!order.stripe_session_id){const {error:couponError}=await db.from('orders').update({discount_code:couponCode||null,stripe_coupon_id:coupon?.stripe_coupon_id||null}).eq('id',order.id).eq('status','pending');if(couponError)throw Error('Unable to save checkout promotion');}
  const session=order.stripe_session_id?await stripe.checkout.sessions.retrieve(order.stripe_session_id):await stripe.checkout.sessions.create({
   ...(coupon?{discounts:[{coupon:coupon.stripe_coupon_id}]}:{}),mode:'payment',payment_method_types:['card'],client_reference_id:order.id,metadata:{order_id:order.id},...(email?{customer_email:email}:{}),
   line_items:order.items.map((x:{title:string;size:string;price:number;quantity:number})=>({quantity:x.quantity,price_data:{currency:'usd',unit_amount:x.price,product_data:{name:x.title+(x.size==='Default Title'?'':' — '+x.size)}}})),
   shipping_address_collection:{allowed_countries:['US']},shipping_options:subtotal>=20000?[{shipping_rate_data:{display_name:'Complimentary US shipping',type:'fixed_amount',fixed_amount:{amount:0,currency:'usd'}}}]:[{shipping_rate:process.env.STRIPE_SHIPPING_RATE_ID!}],
   automatic_tax:{enabled:process.env.STRIPE_AUTOMATIC_TAX_ENABLED!=='false'},expires_at:Math.floor(new Date(order.expires_at).getTime()/1000),
   success_url:origin+'/success?session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/cancel',
   custom_text:{submit:{message:'All sales are final. Returns and exchanges are not accepted.'}}
  },{idempotencyKey:'kashish-'+order.id});
  if(session.status!=='open'||!session.url)return NextResponse.json({error:'This checkout has finished or expired. Please check your orders or start a fresh checkout.',code:'CHECKOUT_EXPIRED'},{status:409});
  if(!validStripeCheckoutUrl(session.url))throw Error('Invalid checkout URL');
  const {error:saveError}=await db.from('orders').update({stripe_session_id:session.id}).eq('id',order.id).eq('status','pending');
  if(saveError)throw Error('Unable to save checkout session');
  const response=NextResponse.json({url:session.url});response.cookies.set(receiptCookie(order.id),body.attemptId,{httpOnly:true,secure:origin.startsWith('https://'),sameSite:'lax',path:'/',maxAge:86400});return response;
 }catch(error){
  // Only definitive Stripe rejection permits release. Network uncertainty must retry
  // the same idempotency key, never release stock behind a possibly valid session.
  if(db&&orderId&&error instanceof Stripe.errors.StripeInvalidRequestError){await db.rpc('settle_checkout',{p_order_id:orderId,p_session_id:null,p_paid:false,p_email:null,p_total:null,p_address:null,p_name:null})}
  console.error('Checkout failed',{orderId,type:error instanceof Stripe.errors.StripeError?error.type:'CheckoutServiceError'});
  return NextResponse.json({error:'We couldn’t open secure checkout. Your bag is saved. Please try again or contact the store.'},{status:503});
 }
}
