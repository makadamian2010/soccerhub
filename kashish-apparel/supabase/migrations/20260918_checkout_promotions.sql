begin;
alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists stripe_coupon_id text;
alter table public.orders add column if not exists stripe_payment_intent text;
create or replace function public.reserve_checkout(p_items jsonb,p_user_id uuid,p_key text,p_signature text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders;item jsonb;v public.variants;product_title text;n integer;subtotal integer:=0;result_items jsonb:='[]';
begin
 if p_key is null or length(p_key)<>64 or p_signature is null then raise exception 'Invalid checkout key';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select * into o from orders where checkout_key=p_key;
 if found then
  if o.cart_signature<>p_signature or o.user_id is distinct from p_user_id then raise exception 'Checkout conflict';end if;
  if o.status<>'pending' or o.expires_at<now() then raise exception 'Checkout expired';end if;
  return jsonb_build_object('id',o.id,'items',o.items,'expires_at',o.expires_at,'stripe_session_id',o.stripe_session_id);
 end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid bag';end if;
 if (select count(distinct value->>'variant') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Duplicate variants';end if;
 insert into orders(user_id,customer_id,checkout_key,cart_signature,receipt_token_hash,expires_at,inventory_mode) values(p_user_id,p_user_id,p_key,p_signature,p_key,now()+interval '60 minutes','reservation-v2') returning * into o;
 for item in select value from jsonb_array_elements(p_items) order by (value->>'variant')::bigint loop
  if (item->>'quantity') is null or (item->>'quantity') !~ '^[0-9]+$' then raise exception 'Invalid quantity';end if;
  n:=(item->>'quantity')::integer;
  if n not between 1 and 10 then raise exception 'Invalid quantity';end if;
  select * into v from variants where id=(item->>'variant')::bigint for update;
  if not found or not v.active or v.stock-v.reserved_stock<n then raise exception 'Insufficient stock';end if;
  select title into product_title from products where id=v.product_id and visible and deleted_at is null;if not found then raise exception 'Product unavailable';end if;
  update variants set reserved_stock=reserved_stock+n where id=v.id;
  insert into order_items values(o.id,v.id,v.product_id,product_title,v.title,v.price,n);
  result_items:=result_items||jsonb_build_array(jsonb_build_object('product_id',v.product_id,'variant',v.id,'title',product_title,'size',v.title,'price',v.price,'quantity',n));subtotal:=subtotal+v.price*n;
 end loop;
 update orders set total=subtotal,total_price=subtotal,items=result_items where id=o.id;
 return jsonb_build_object('id',o.id,'items',result_items,'expires_at',o.expires_at,'stripe_session_id',null);
end $$;

create or replace function public.settle_checkout(p_order_id uuid,p_session_id text,p_paid boolean,p_email text,p_total integer,p_address jsonb,p_name text)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders;item record;
begin
 select * into o from orders where id=p_order_id for update;
 if not found or o.inventory_mode<>'reservation-v2' then raise exception 'Order not found';end if;
 if o.stripe_session_id is not null and o.stripe_session_id<>p_session_id then raise exception 'Session mismatch';end if;
 if o.status<>'pending' then
  if p_paid and o.status='expired' then raise exception 'Paid order requires reconciliation';end if;
  return;
 end if;
 if p_paid and (p_total is null or p_total<o.total_price-o.discount_total) then raise exception 'Payment total mismatch';end if;
 for item in select * from order_items where order_id=p_order_id order by variant_id loop
  if p_paid then update variants set stock=stock-item.quantity,reserved_stock=reserved_stock-item.quantity where id=item.variant_id;
  else update variants set reserved_stock=reserved_stock-item.quantity where id=item.variant_id;end if;
 end loop;
 update orders set status=case when p_paid then 'paid' else 'expired' end,payment_status=case when p_paid then 'paid' else 'expired' end,order_status=case when p_paid then 'processing' else 'cancelled' end,email=coalesce(p_email,email),customer_name=coalesce(p_name,customer_name),total=case when p_paid then p_total else total end,total_price=case when p_paid then p_total else total_price end,shipping_address=coalesce(p_address,shipping_address),stripe_session_id=coalesce(stripe_session_id,p_session_id) where id=p_order_id;
end $$;

commit;
