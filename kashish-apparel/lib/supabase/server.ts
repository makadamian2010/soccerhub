import {createServerClient} from '@supabase/ssr';
import {sessionCookieOptions} from './cookie-options';
import {cookies} from 'next/headers';
export async function sessionDatabase(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;const jar=await cookies();return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll(values){try{for(const {name,value,options} of values)jar.set(name,value,sessionCookieOptions(options,jar.get('ka_remember')?.value==='1'))}catch{/* Server Component: refresh occurs in middleware. */}}}})}
