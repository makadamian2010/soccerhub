import {NextRequest,NextResponse} from 'next/server';
import {sessionCookieOptions} from './lib/supabase/cookie-options';
import {createServerClient} from '@supabase/ssr';
export async function middleware(req:NextRequest){let response=NextResponse.next({request:req});const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return response;const client=createServerClient(url,key,{cookies:{getAll:()=>req.cookies.getAll(),setAll(values){values.forEach(({name,value})=>req.cookies.set(name,value));response=NextResponse.next({request:req});values.forEach(({name,value,options})=>response.cookies.set(name,value,sessionCookieOptions(options,req.cookies.get('ka_remember')?.value==='1')))}}});await client.auth.getUser();return response}
export const config={matcher:['/((?!_next/static|_next/image|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
