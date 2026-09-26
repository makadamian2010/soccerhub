import type {Metadata} from 'next';
import './globals.css';
import './luxury.css';
import './platform.css';
import {getPublicCatalog} from '@/lib/public-catalog';
import CatalogTools from '@/components/catalog-tools';
import {CatalogProvider} from '@/components/catalog-provider';
export const metadata:Metadata={title:'Kashish Apparel | Timeless Pakistani Elegance',description:'Discover designer Pakistani fashion, wedding formals, luxury lawn and menswear at Kashish Apparel.'};
export default async function Layout({children}:{children:React.ReactNode}){let catalog;try{catalog=await getPublicCatalog()}catch{catalog={products:[],content:{},connected:true,error:'The store catalog is temporarily unavailable. Please try again shortly.'}}return <html lang="en"><body><CatalogProvider initialData={catalog}>{children}<CatalogTools/></CatalogProvider></body></html>}
