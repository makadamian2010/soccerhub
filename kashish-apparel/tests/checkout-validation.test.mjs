import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCart,validAttempt,validStripeCheckoutUrl} from '../lib/checkout-validation.mjs';
import {randomUUID} from 'node:crypto';
test('checkout sends only variant IDs and quantities; client price and customer IDs are discarded',()=>assert.deepEqual(validateCart([{variant:2,quantity:2,price:1,customer_id:'attacker'},{variant:1,quantity:1}]),[{variant:1,quantity:1},{variant:2,quantity:2}]));
test('empty, malformed, duplicate and oversized bags are rejected',()=>{for(const input of [null,[],[{}],[{variant:1,quantity:0}],[{variant:1,quantity:1.5}],[{variant:1,quantity:11}],[{variant:1,quantity:1},{variant:1,quantity:1}],Array.from({length:21},(_,i)=>({variant:i+1,quantity:1}))])assert.throws(()=>validateCart(input))});
test('checkout request keys require UUID v4',()=>{assert.ok(validAttempt(randomUUID()));assert.equal(validAttempt('guessable-id'),false);assert.equal(validAttempt(null),false)});
test('redirects only to Stripe hosted checkout',()=>{assert.ok(validStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_123'));for(const url of ['https://checkout.stripe.com.evil.test','javascript:alert(1)','http://checkout.stripe.com/pay','https://evil.test/?checkout.stripe.com'])assert.equal(validStripeCheckoutUrl(url),false)});
