import {NextRequest,NextResponse} from 'next/server';
import {sessionDatabase} from '@/lib/supabase/server';
export async function GET(req:NextRequest){const code=req.nextUrl.searchParams.get('code'),next=req.nextUrl.searchParams.get('next')||'/account';const target=next.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\')?next:'/account';const db=await sessionDatabase();if(db&&code){const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(target,req.url))}return NextResponse.redirect(new URL('/login?error=verification',req.url))}
