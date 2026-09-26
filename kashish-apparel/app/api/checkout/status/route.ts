import {NextRequest,NextResponse} from 'next/server';
import {database} from '@/lib/server';
import {receiptCookie,tokenMatches,stripeClient,settleSession} from '@/lib/payments';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export async function GET(req:NextRequest){
 const sessionId=req.nextUrl.searchParams.get('session_id');if(!sessionId||!/^cs_(test_|live_)?[a-zA-Z0-9_]+$/.test(sessionId))return NextResponse.json({error:'An order reference is required.'},{status:400,headers});
 try{const db=database();const {data:order,error}=await db.from('orders').select('id,user_id,receipt_token_hash,payment_status').eq('stripe_session_id',sessionId).single();
  if(error||!order)return NextResponse.json({error:'Order not found.'},{status:404,headers});
  let allowed=tokenMatches(req.cookies.get(receiptCookie(order.id))?.value,order.receipt_token_hash);
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!allowed&&token){const {data}=await db.auth.getUser(token);allowed=!!data.user&&order.user_id===data.user.id}
  if(!allowed)return NextResponse.json({error:'For your privacy, open this confirmation in the browser used at checkout, or sign in to your account.'},{status:403,headers});
  const session=await stripeClient().checkout.sessions.retrieve(sessionId);await settleSession(session);
  const {data:updated,error:loadError}=await db.from('orders').select('order_number,payment_status,order_status,customer_name,email,shipping_address,items,total_price').eq('id',order.id).single();if(loadError||!updated)throw Error('Order unavailable');
  return NextResponse.json({order:updated},{headers});
 }catch{return NextResponse.json({error:'Your order confirmation is not available yet. Please try again shortly.'},{status:503,headers})}
}
