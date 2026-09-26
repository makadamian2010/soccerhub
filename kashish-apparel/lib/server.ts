import {createClient} from '@supabase/supabase-js';
export function database(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Service not configured');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin||origin===process.env.NEXT_PUBLIC_SITE_URL}
export const emailValid=(x:unknown):x is string=>typeof x==='string'&&x.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
export async function rateLimit(db:ReturnType<typeof database>,scope:string,identity:string){const {data,error}=await db.rpc('consume_rate_limit',{p_key:scope+':'+identity,p_limit:5});if(error)throw Error('Please try again later.');return data===true;}
