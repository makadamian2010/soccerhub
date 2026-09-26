'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {products as initial,Product} from '@/lib/catalog';
type Catalog={products:Product[];content:Record<string,any>;connected:boolean;error?:string};
const Context=createContext<Catalog>({products:initial,content:{},connected:false});
export function CatalogProvider({children,initialData}:{children:React.ReactNode;initialData:Catalog}){const [data,setData]=useState<Catalog>(initialData);useEffect(()=>{const load=()=>fetch('/api/catalog',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setData(d)}).catch(()=>setData(d=>({...d,error:'Live catalog updates are temporarily unavailable.'})));load();window.addEventListener('focus',load);return()=>window.removeEventListener('focus',load)},[]);return <Context.Provider value={data}>{children}</Context.Provider>}
export const useCatalog=()=>useContext(Context);
