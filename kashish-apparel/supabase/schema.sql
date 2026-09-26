-- Apply once in the Supabase SQL editor. Service-role access only for mutations.
create table public.products (id bigint primary key,handle text unique not null,title text not null,description text,images jsonb not null default '[]',collections text[] not null default '{}');
create table public.variants (id bigint primary key,product_id bigint references public.products(id),title text not null,price integer not null check(price>=0),stock integer not null default 0 check(stock>=0),active boolean not null default false);
create table public.orders (id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),email text,status text not null default 'pending' check(status in ('pending','paid','shipped','delivered','expired')),total integer,stripe_session_id text unique,tracking_url text,shipping_address jsonb,created_at timestamptz not null default now());
create table public.order_items (order_id uuid references public.orders(id),variant_id bigint references public.variants(id),product_id bigint references public.products(id),title text not null,size text not null,price integer not null,quantity integer not null check(quantity between 1 and 10),primary key(order_id,variant_id));
create table public.reviews (id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),order_id uuid references public.orders(id),product_id bigint references public.products(id),rating integer check(rating between 1 and 5),body text check(length(body) between 10 and 2000),approved boolean not null default false,created_at timestamptz default now(),unique(user_id,product_id,order_id));
create table public.contact_messages (id uuid primary key default gen_random_uuid(),name text not null,email text not null,phone text,message text not null,created_at timestamptz default now());
create table public.newsletter_subscribers (email text primary key,created_at timestamptz default now());
create table public.rate_limits (key text primary key,window_start timestamptz not null default now(),count integer not null default 1);
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.rate_limits enable row level security;
create policy products_read on public.products for select using (true);
create policy variants_read on public.variants for select using (true);
create policy own_orders on public.orders for select to authenticated using (user_id=auth.uid() or lower(email)=lower(auth.jwt()->>'email'));
create policy own_order_items on public.order_items for select to authenticated using (exists(select 1 from public.orders where orders.id=order_id and (orders.user_id=auth.uid() or lower(orders.email)=lower(auth.jwt()->>'email'))));
create policy public_reviews on public.reviews for select using(approved=true);
create or replace function public.reserve_order(p_items jsonb,p_user_id uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare o uuid; item jsonb; v public.variants; product_title text; result_items jsonb:='[]'; subtotal integer:=0; n integer;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid bag';end if;
 insert into orders(user_id) values(p_user_id) returning id into o;
 for item in select value from jsonb_array_elements(p_items) order by (value->>'variant')::bigint loop
  n:=(item->>'quantity')::integer;
  if n not between 1 and 10 then raise exception 'Invalid quantity';end if;
  select * into v from variants where id=(item->>'variant')::bigint for update;
  if not found or not v.active or v.stock<n then raise exception 'Insufficient stock';end if;
  select title into product_title from products where id=v.product_id;
  update variants set stock=stock-n where id=v.id;
  insert into order_items values(o,v.id,v.product_id,product_title,v.title,v.price,n);
  result_items:=result_items||jsonb_build_array(jsonb_build_object('title',product_title,'size',v.title,'price',v.price,'quantity',n));subtotal:=subtotal+v.price*n;
 end loop;
 update orders set total=subtotal where id=o;
 return jsonb_build_object('id',o,'items',result_items);
end $$;
create or replace function public.finish_order(p_order_id uuid,p_paid boolean,p_email text,p_total integer,p_address jsonb) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders; item record;
begin
 select * into o from orders where id=p_order_id for update;
 if not found then raise exception 'Order not found';end if;
 if o.status<>'pending' then return;end if;
 if p_paid then update orders set status='paid',email=p_email,total=p_total,shipping_address=p_address where id=p_order_id;
 else
  for item in select * from order_items where order_id=p_order_id order by variant_id loop update variants set stock=stock+item.quantity where id=item.variant_id;end loop;
  update orders set status='expired' where id=p_order_id;
 end if;
end $$;
create or replace function public.consume_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into rate_limits(key) values(p_key) on conflict(key) do update set count=case when rate_limits.window_start<now()-interval '1 hour' then 1 else rate_limits.count+1 end,window_start=case when rate_limits.window_start<now()-interval '1 hour' then now() else rate_limits.window_start end returning count into n;
 return n<=p_limit;
end $$;
revoke all on function public.reserve_order(jsonb,uuid) from public,anon,authenticated;
revoke all on function public.finish_order(uuid,boolean,text,integer,jsonb) from public,anon,authenticated;
revoke all on function public.consume_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.reserve_order(jsonb,uuid) to service_role;
grant execute on function public.finish_order(uuid,boolean,text,integer,jsonb) to service_role;
grant execute on function public.consume_rate_limit(text,integer) to service_role;
revoke all on public.products,public.variants,public.orders,public.order_items,public.reviews,public.contact_messages,public.newsletter_subscribers,public.rate_limits from anon,authenticated;
grant select on public.products,public.variants to anon,authenticated;
grant select(rating,body,product_id,approved) on public.reviews to anon,authenticated;
grant select on public.orders,public.order_items to authenticated;
grant all on public.products,public.variants,public.orders,public.order_items,public.reviews,public.contact_messages,public.newsletter_subscribers,public.rate_limits to service_role;
