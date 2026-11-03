import type { View } from '@/config/navigation';
export type ManagerPageProps={apiBase:string;token:string;abilities:string[];onChanged:()=>Promise<void>;onSalesNavigate?:(next:View)=>void};
