import {database} from './server';
import {sessionDatabase} from './supabase/server';
export class AccessError extends Error{constructor(public status:number,message:string){super(message)}}
export async function requireAdmin(){const db=await sessionDatabase();if(!db)throw new AccessError(503,'Store services have not been connected yet.');const {data:{user}}=await db.auth.getUser();if(!user)throw new AccessError(401,'Please sign in.');const {data:profile}=await db.from('users').select('role,first_name,last_name,email').eq('auth_id',user.id).single();if(profile?.role!=='admin')throw new AccessError(403,'Owner access is required.');return {user,profile,db:database()}}
export function safeUrl(value:unknown){if(typeof value!=='string')return false;try{return new URL(value).protocol==='https:'}catch{return false}}
