import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireAdmin,AccessError} from '@/lib/admin';
import AdminDashboard from '@/components/admin-dashboard';
export const metadata={title:'Owner Dashboard | Kashish Apparel',robots:{index:false,follow:false}};
export default async function AdminPage(){try{const {profile}=await requireAdmin();return <AdminDashboard owner={profile}/>}catch(e){if(e instanceof AccessError&&e.status===401)redirect('/login?next=/admin/dashboard');return <main className="admin-access"><span className="admin-brand-mark">K</span><p className="eyebrow">KASHISH APPAREL · OWNER DASHBOARD</p><h1>{e instanceof AccessError&&e.status===403?'Owner access required.':'Connect your store to begin.'}</h1><p>{e instanceof AccessError?e.message:'The dashboard is temporarily unavailable.'}</p><p>Product, customer, and payment data are available only after secure owner sign-in.</p><div className="form-actions"><Link className="button" href="/login?next=/admin/dashboard">OWNER LOGIN</Link><Link href="/owner-setup">First-time owner setup →</Link></div><Link className="text-link" href="/">Return to the store</Link></main>}}
