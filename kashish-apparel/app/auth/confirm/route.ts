import {NextRequest,NextResponse} from 'next/server';
import {sessionDatabase} from '@/lib/supabase/server';
import type {EmailOtpType} from '@supabase/supabase-js';
export async function GET(req:NextRequest){const token=req.nextUrl.searchParams.get('token_hash'),type=req.nextUrl.searchParams.get('type');const db=await sessionDatabase();if(db&&token&&type&&['signup','email','recovery','email_change','invite'].includes(type)){const {error}=await db.auth.verifyOtp({token_hash:token,type:type as EmailOtpType});if(!error)return NextResponse.redirect(new URL(type==='recovery'?'/reset-password':'/account',req.url))}return NextResponse.redirect(new URL('/login?error=verification',req.url))}
