import {NextResponse} from 'next/server';
import {settleSession,stripeClient} from '@/lib/payments';
import type Stripe from 'stripe';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return new Response('Not configured',{status:503});
 const stripe=stripeClient();let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await req.text(),req.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET)}catch{return new Response('Invalid signature',{status:400})}
 const supported=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired','checkout.session.async_payment_failed'];
 if(!supported.includes(event.type))return NextResponse.json({received:true});
 try{const eventSession=event.data.object as Stripe.Checkout.Session;
  // Stripe is the source of truth when events arrive out of order.
  const current=await stripe.checkout.sessions.retrieve(eventSession.id);
  await settleSession(current,event.type==='checkout.session.async_payment_failed');return NextResponse.json({received:true});
 }catch{console.error('Payment event settlement failed',{eventId:event.id});return new Response('Order settlement failed; retry required',{status:500})}
}
