import {NextResponse} from 'next/server';
import type Stripe from 'stripe';
import {timingSafeEqual} from 'node:crypto';
import {database} from '@/lib/server';
import {settleSession,stripeClient} from '@/lib/payments';
export const runtime='nodejs';
export async function GET(req:Request){
 const supplied=req.headers.get('authorization')||'',expected='Bearer '+process.env.CRON_SECRET;
 if(!process.env.CRON_SECRET||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return new Response('Unauthorized',{status:401});
 try{const db=database(),stripe=stripeClient();const {data:orders,error}=await db.from('orders').select('id,stripe_session_id,created_at,expires_at').eq('inventory_mode','reservation-v2').eq('status','pending').lt('expires_at',new Date().toISOString()).order('created_at').limit(50);if(error)throw error;
  let reconciled=0,failed=0;
  for(const order of orders||[]){try{let session:Stripe.Checkout.Session|null=order.stripe_session_id?await stripe.checkout.sessions.retrieve(order.stripe_session_id):null;
   if(!session){const sessions=await stripe.checkout.sessions.list({created:{gte:Math.floor(new Date(order.created_at).getTime()/1000)-60,lte:Math.floor(new Date(order.expires_at).getTime()/1000)},limit:100}).autoPagingToArray({limit:1000});session=sessions.find(s=>s.metadata?.order_id===order.id)||null}
   if(session){if(session.status==='open')session=await stripe.checkout.sessions.expire(session.id);await settleSession(session)}
   else{const {error:releaseError}=await db.rpc('settle_checkout',{p_order_id:order.id,p_session_id:null,p_paid:false,p_email:null,p_total:null,p_address:null,p_name:null});if(releaseError)throw releaseError}
   reconciled++;
  }catch{failed++;console.error('Checkout reconciliation requires retry',{orderId:order.id})}}
  return NextResponse.json({reconciled,failed},{status:failed?503:200});
 }catch{return NextResponse.json({error:'Reconciliation unavailable.'},{status:503})}
}
