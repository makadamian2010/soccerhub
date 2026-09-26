import {NextResponse} from 'next/server';
import {getPublicCatalog} from '@/lib/public-catalog';
export async function GET(){try{return NextResponse.json(await getPublicCatalog(),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'The store catalog is temporarily unavailable. Please try again.'},{status:503})}}
