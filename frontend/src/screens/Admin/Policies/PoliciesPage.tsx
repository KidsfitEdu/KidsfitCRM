'use client';

import { useCallback,useEffect,useState } from 'react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AdminListPanel,AdminListToolbar,AdminStatusBadge,adminTableClass,adminTableHeadClass } from '@/components/common/admin-list-ui';
import { fetchAdminPolicies } from '@/services/policy.service';
import { workflowLabels,type SchoolOperationsWorkspace } from '@/lib/school-operations';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function PoliciesPage({apiBase,token}:AdminPageProps) {
  const [operations,setOperations]=useState<SchoolOperationsWorkspace|null>(null);
  const [policyDraft,setPolicyDraft]=useState('');const [policySearch,setPolicySearch]=useState('');
  const [policyStatus,setPolicyStatus]=useState('ALL');const [policyPage,setPolicyPage]=useState(1);
  const [policyPageSize,setPolicyPageSize]=useState(20);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const preview=!apiBase;
  const reload=useCallback(async()=>{
    if(preview||!token)return;setBusy(true);setError('');
    try{setOperations(await fetchAdminPolicies(apiBase,token));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được dữ liệu.');}finally{setBusy(false);}
  },[apiBase,token,preview]);
  useEffect(()=>{void reload();},[reload]);
  const filteredPolicies=(operations?.policies??[]).filter(p=>(policyStatus==='ALL'||p.status===policyStatus)&&(policySearch===''||`Phiên bản ${p.version} ${workflowLabels[p.status]??p.status}`.toLocaleLowerCase('vi').includes(policySearch.toLocaleLowerCase('vi'))));
  return <AdminPageStatus apiBase={apiBase} error={error}>
    <div className="space-y-5">
      <AppPageHeader eyebrow="QUẢN TRỊ / CHÍNH SÁCH VẬN HÀNH" title="Quản lý chính sách vận hành"
        description="Theo dõi phiên bản chính sách và thời hạn xử lý đang được ghi nhận."/>
      <AdminListPanel>
        <AdminListToolbar search={policyDraft} onSearchChange={setPolicyDraft}
          onSearch={()=>{setPolicySearch(policyDraft.trim());setPolicyPage(1);}}
          onReset={()=>{setPolicyDraft('');setPolicySearch('');setPolicyStatus('ALL');setPolicyPage(1);}}
          placeholder="Tìm phiên bản hoặc trạng thái..." searchLabel="Tìm chính sách"
          filters={<AppNativeSelect aria-label="Lọc trạng thái chính sách" containerClassName="h-11 w-full sm:w-[200px]"
            value={policyStatus} onChange={e=>{setPolicyStatus(e.target.value);setPolicyPage(1);}}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="SUPERSEDED">Đã thay phiên bản</option>
          </AppNativeSelect>}/>
        <div className="overflow-x-auto">
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}><tr>
              <th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4 text-center">Quản lý duyệt</th>
              <th className="px-5 py-4 text-center">Admin duyệt</th><th className="px-5 py-4 text-center">Trạng thái</th>
            </tr></thead>
            <tbody>{filteredPolicies.slice((policyPage - 1) * policyPageSize, policyPage * policyPageSize).map(p=>
              <tr key={p.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
                <td className="px-5 py-4 font-semibold">Phiên bản {p.version}</td>
                <td className="px-5 py-4 text-center">{p.manager_review_hours} giờ</td>
                <td className="px-5 py-4 text-center">{p.admin_review_hours} giờ</td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status} label={workflowLabels[p.status]??p.status}/></td>
              </tr>)}</tbody>
          </table>
          {!busy && filteredPolicies.length === 0 &&
            <p className="p-8 text-center text-sm text-muted-foreground">Không có chính sách phù hợp.</p>}
          {busy && <p className="p-5 text-sm text-muted-foreground">Đang tải chính sách…</p>}
        </div>
        <AppPagination page={policyPage} pageSize={policyPageSize} total={filteredPolicies.length}
          showSummary={false} disabled={busy} pageSizeOptions={[10,20,50]}
          onPageChange={setPolicyPage}
          onPageSizeChange={size=>{setPolicyPageSize(size);setPolicyPage(1);}}/>
      </AdminListPanel>
      <p className="text-xs text-muted-foreground">Chỉ hiển thị chính sách đã lưu; các SLA chưa được phê duyệt không tự động kích hoạt.</p>
    </div>
  </AdminPageStatus>;
}
