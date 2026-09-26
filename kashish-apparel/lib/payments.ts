import Stripe from 'stripe';
import {createHash,timingSafeEqual} from 'node:crypto';
import {database} from './server';
export function stripeClient(){if(!process.env.STRIPE_SECRET_KEY)throw Error('Stripe is not configured');return new Stripe(process.env.STRIPE_SECRET_KEY,{maxNetworkRetries:2,timeout:20000})}
export function tokenHash(value:string){return createHash('sha256').update(value).digest('hex')}
export function receiptCookie(orderId:string){return 'ka_receipt_'+orderId.replaceAll('-','')}
export function tokenMatches(value:string|undefined,expected:string|null){if(!value||!expected)return false;const actual=tokenHash(value);return actual.length===expected.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected))}
export async function settleSession(session:Stripe.Checkout.Session,confirmedFailure=false){
 const id=session.metadata?.order_id;if(!id)throw Error('Missing order reference');
 const db=database();const {data:order,error}=await db.from('orders').select('id,inventory_mode,stripe_session_id,total_price,total,stripe_coupon_id').eq('id',id).single();if(error||!order)throw Error('Order not found');
 if(order.stripe_session_id&&order.stripe_session_id!==session.id)throw Error('Payment session mismatch');
 if(session.client_reference_id!==id||session.currency!=='usd')throw Error('Payment identity mismatch');
 const paid=session.payment_status==='paid';if(!paid&&session.status!=='expired'&&!confirmedFailure)return;
 if(paid){const {data:items,error:itemsError}=await db.from('order_items').select('price,quantity').eq('order_id',id);if(itemsError||!items?.length||session.amount_subtotal!==items.reduce((sum,item)=>sum+item.price*item.quantity,0))throw Error('Payment subtotal mismatch');}
 if(paid&&order.inventory_mode==='reservation-v2'){const discount=session.total_details?.amount_discount||0;if(discount<0||discount>(session.amount_subtotal||0)||discount>0&&!order.stripe_coupon_id)throw Error('Unexpected payment discount');const {error:paymentError}=await db.from('orders').update({discount_total:discount,stripe_payment_intent:typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null}).eq('id',id);if(paymentError)throw Error('Unable to save payment details');}
 const args={p_order_id:id,p_paid:paid,p_email:session.customer_details?.email||null,p_total:session.amount_total,p_address:session.collected_information?.shipping_details||null};
 const {error:settleError}=order.inventory_mode==='reservation-v2'?await db.rpc('settle_checkout',{...args,p_session_id:session.id,p_name:session.customer_details?.name||null}):await db.rpc('finish_order',args);
 if(settleError)throw Error('Order settlement failed');
}
