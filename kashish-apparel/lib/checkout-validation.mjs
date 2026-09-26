export function validateCart(input) {
 if (!Array.isArray(input)||input.length===0||input.length>20) throw Error('Your bag must contain between 1 and 20 different items.');
 const items=input.map(item=>{if(!item||!Number.isSafeInteger(item.variant)||item.variant<=0||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10)throw Error('Please choose a quantity between 1 and 10 for each item.');return {variant:item.variant,quantity:item.quantity}}).sort((a,b)=>a.variant-b.variant);
 if(new Set(items.map(x=>x.variant)).size!==items.length)throw Error('Please combine duplicate items in your bag.');return items;
}
export function validAttempt(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
export function validStripeCheckoutUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='checkout.stripe.com'}catch{return false}}
