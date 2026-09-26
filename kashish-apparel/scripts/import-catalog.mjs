import fs from 'node:fs/promises';
const base='https://kashishapparel.com';
const collections=(await (await fetch(`${base}/collections.json?limit=250`)).json()).collections;
const map=new Map();
for(const c of collections){const ps=(await (await fetch(`${base}/collections/${c.handle}/products.json?limit=250`)).json()).products;for(const p of ps){const old=map.get(p.id);map.set(p.id,{...p,collections:[...(old?.collections||[]),c.handle]});}}
const all=(await (await fetch(`${base}/products.json?limit=250`)).json()).products;for(const p of all)if(!map.has(p.id))map.set(p.id,{...p,collections:[]});
await fs.writeFile('data/catalog.json',JSON.stringify({importedAt:new Date().toISOString(),source:base,collections,products:[...map.values()]},null,2));
console.log(`Imported ${map.size} products across ${collections.length} collections`);
