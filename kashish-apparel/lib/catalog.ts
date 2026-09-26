import data from '@/data/catalog.json';
export type Product={id:number;handle:string;title:string;body_html:string;collections:string[];published_at:string;images:{id:number;src:string}[];variants:{id:number;title:string;price:string;compare_at_price:string|null;available:boolean}[];brand?:string;fabric?:string;care_instructions?:string;video_urls?:string[];featured?:boolean;new_arrival?:boolean};
export const products:Product[]=data.products;
export const collections=data.collections;
export const women=[['Wedding Formals','wedding-formals'],['Designer Sarees','designer-sarees'],['Formal Chiffons','chiffon-formals'],['Semi Formals','chiffons-semi-formals'],['Agha Noor Collections','formal-aghanoor'],['Luxury Lawn','luxury-lawn'],['Kurtis','kurtis'],['Cord Sets','cord-sets'],['3 Piece Ensembles','3-piece'],['Winter Wear','spring-summer']];
export const money=(n:number|string)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n));
export const photo=(p:Product,width=700)=>{const src=p.images[0]?.src||'';return src.includes('shopify.com')||src.includes('kashishapparel.com/cdn/')?src+(src.includes('?')?'&':'?')+'width='+width:src};
