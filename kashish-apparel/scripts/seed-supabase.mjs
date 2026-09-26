import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('data/catalog.json','utf8'));
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Set Supabase environment variables first.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const ps=data.products.map(p=>({id:p.id,handle:p.handle,title:p.title,description:p.body_html.replace(/<[^>]+>/g,' '),images:p.images,collections:p.collections}));
let {error}=await db.from('products').upsert(ps);if(error)throw error;
// Do not infer stock quantities from the public available flag. Preserve existing stock on re-import.
const vs=data.products.flatMap(p=>p.variants.map(v=>({id:v.id,product_id:p.id,title:v.title,price:Math.round(Number(v.price)*100)})));
for(let i=0;i<vs.length;i+=100){const {error}=await db.from('variants').upsert(vs.slice(i,i+100),{onConflict:'id',ignoreDuplicates:true});if(error)throw error;}
console.log(`Seeded ${ps.length} products. New variants remain inactive with zero stock until verified.`);
