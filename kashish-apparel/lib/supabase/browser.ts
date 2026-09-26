'use client';
import {createBrowserClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';
import {sessionCookieOptions} from './cookie-options';
let client:ReturnType<typeof createBrowserClient>|null=null;
export function browserDatabase(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;return client??=createBrowserClient(url,key,{cookies:{getAll:()=>parseCookieHeader(document.cookie),setAll(values){const remember=parseCookieHeader(document.cookie).some(c=>c.name==='ka_remember'&&c.value==='1');for(const {name,value,options} of values)document.cookie=serializeCookieHeader(name,value,sessionCookieOptions(options,remember))}}})}
