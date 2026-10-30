'use client';

import { useCallback,useEffect,useState } from 'react';
import { Plus,Eye } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormActions } from '@/components/common/form-actions';
import { FormError } from '@/components/common/form-error';
import { appNotice } from '@/components/common/app-toast-provider';
import { AdminListPanel,AdminListToolbar,AdminIconAction,AdminStatusBadge,adminTableClass,adminTableHeadClass } from '@/src/components/common/admin-list-ui';
import { fetchAdminManagement,createAdminTeamMember } from '@/src/services/personnel.service';
import type { ChannelManagement } from '@/lib/channel-operations';
import { AdminPageStatus } from '@/src/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function PersonnelPage({apiBase,token,abilities}:AdminPageProps) {
  const [management,setManagement]=useState<ChannelManagement|null>(null);
  const [teamFormOpen,setTeamFormOpen]=useState(false);
  const [teamSearch,setTeamSearch]=useState('');const [teamDraft,setTeamDraft]=useState('');
  const [teamPage,setTeamPage]=useState(1);const [teamPageSize,setTeamPageSize]=useState(20);
  const [teamDetail,setTeamDetail]=useState<ChannelManagement['team'][number]|null>(null);
  const [teamStatus,setTeamStatus]=useState('ALL');
  const [teamForm,setTeamForm]=useState({name:'',email:'',password:'',organization_id:'',role_code:'CHANNEL_SALES'});
  const [formErrors,setFormErrors]=useState<Record<string,string>>({});
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const preview=!apiBase;
  const can=(permission:string)=>abilities.includes('*')||abilities.includes(permission);
  const reload=useCallback(async()=>{
    if(preview||!token)return;setBusy(true);setError('');
    try{setManagement(await fetchAdminManagement(apiBase,token));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được dữ liệu.');}finally{setBusy(false);}
  },[apiBase,token,preview]);
  useEffect(()=>{void reload();},[reload]);
  const createTeamMember=async()=>{
    const errs:Record<string,string>={};
    if(!teamForm.name.trim())errs.name='Cần nhập họ tên.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamForm.email))errs.email='Email không hợp lệ.';
    if(teamForm.password.length<12)errs.password='Mật khẩu cần ít nhất 12 ký tự.';
    if(!teamForm.organization_id)errs.organization_id='Vui lòng chọn tổ chức.';
    setFormErrors(errs);if(Object.keys(errs).length)return;
    setBusy(true);setError('');
    try{await createAdminTeamMember(apiBase,token,{...teamForm,organization_id:Number(teamForm.organization_id)});
      setTeamFormOpen(false);setTeamForm({name:'',email:'',password:'',organization_id:'',role_code:'CHANNEL_SALES'});appNotice.success('Đã tạo tài khoản nhân sự.');await reload();
    }catch(e){setError(e instanceof Error?e.message:'Không tạo được tài khoản.');}finally{setBusy(false);}
  };
  return <AdminPageStatus apiBase={apiBase} error={error}>
    <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN TRỊ / NHÂN SỰ & ĐỐI TÁC" title="Nhân sự & đối tác"
    description="Quản lý tài khoản, tổ chức, vai trò và trạng thái nhân sự."
    actions={<AppButton tone="green" premium leadingIcon={<Plus className="size-4"/>}
      disabled={preview||!can('channel_sales.team.manage')} onClick={()=>{setFormErrors({});setTeamFormOpen(true);}}>Thêm nhân sự</AppButton>}/>
  <AdminListPanel>
    <AdminListToolbar search={teamDraft} onSearchChange={setTeamDraft}
      onSearch={()=>{setTeamSearch(teamDraft.trim());setTeamPage(1);}}
      onReset={()=>{setTeamDraft('');setTeamSearch('');setTeamStatus('ALL');setTeamPage(1);}}
      placeholder="Tên nhân sự, email hoặc tổ chức..." searchLabel="Tìm nhân sự và đối tác"
      filters={<AppNativeSelect aria-label="Lọc trạng thái nhân sự" value={teamStatus} containerClassName="h-11 w-full sm:w-[200px]"
        onChange={e=>{setTeamStatus(e.target.value);setTeamPage(1);}}>
        <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="SUSPENDED">Tạm khóa</option>
      </AppNativeSelect>}/>
    <div className="overflow-x-auto">
      <table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Nhân sự</th><th className="px-5 py-4">Tổ chức</th>
          <th className="px-5 py-4 text-center">Vai trò</th><th className="px-5 py-4 text-center">Trạng thái</th>
          <th className="px-5 py-4 text-center">Thao tác</th></tr></thead>
        <tbody>{management?.team.filter(u=>(teamStatus==='ALL'||u.status===teamStatus)&&[u.name,u.email,u.organization_name].some(x=>x.toLocaleLowerCase('vi').includes(teamSearch.toLocaleLowerCase('vi'))))
          .slice((teamPage-1)*teamPageSize,teamPage*teamPageSize).map(u=><tr key={u.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
          <td className="px-5 py-4"><p className="font-semibold">{u.name}</p><p className="mt-1 text-xs text-muted-foreground">{u.email}</p></td>
          <td className="px-5 py-4">{u.organization_name}</td>
          <td className="px-5 py-4 text-center">{management.roles.find(r=>r.code===u.membership_type)?.name??u.membership_type}</td>
          <td className="px-5 py-4 text-center"><AdminStatusBadge status={u.status} label={u.status==='ACTIVE'?'Hoạt động':u.status==='SUSPENDED'?'Tạm khóa':u.status}/></td>
          <td className="px-5 py-4 text-center"><AdminIconAction icon={Eye} label={`Xem ${u.name}`} onClick={()=>setTeamDetail(u)}/></td>
        </tr>)}</tbody>
      </table>
      {!busy && management && !management.team.some(u=>(teamStatus==='ALL'||u.status===teamStatus)&&[u.name,u.email,u.organization_name].some(x=>x.toLocaleLowerCase('vi').includes(teamSearch.toLocaleLowerCase('vi'))))
        && <p className="p-8 text-center text-sm text-muted-foreground">Không có nhân sự phù hợp.</p>}
      {!management && <p className="p-8 text-center text-sm text-muted-foreground">{busy?'Đang tải nhân sự…':'Chưa có dữ liệu hoặc chưa đủ quyền.'}</p>}
    </div>
    {management && <AppPagination page={teamPage} pageSize={teamPageSize}
      total={management.team.filter(u=>(teamStatus==='ALL'||u.status===teamStatus)&&[u.name,u.email,u.organization_name].some(x=>x.toLocaleLowerCase('vi').includes(teamSearch.toLocaleLowerCase('vi')))).length}
      itemLabel="nhân sự" showSummary={false} pageSizeOptions={[10,20,50]}
      onPageChange={setTeamPage} onPageSizeChange={v=>{setTeamPageSize(v);setTeamPage(1);}}/>}
  </AdminListPanel>
  <Dialog open={teamFormOpen} onOpenChange={open=>{if(!busy)setTeamFormOpen(open);}}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Thêm nhân sự</DialogTitle><DialogDescription>Tạo tài khoản thuộc tổ chức được quản lý. Không cấp quyền Admin/BGĐ tại đây.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['name','email','password'] as const).map(k=><label className="text-sm font-medium" key={k}>
          {({name:'Họ và tên',email:'Email',password:'Mật khẩu ban đầu (tối thiểu 12 ký tự)'} as Record<string,string>)[k]}
          <Input className="mt-1.5 h-11" type={k==='password'?'password':'text'} aria-invalid={!!formErrors[k]} value={teamForm[k]}
            onChange={e=>{setTeamForm(t=>({...t,[k]:e.target.value}));setFormErrors(x=>({...x,[k]:''}));}}/><FormError>{formErrors[k]}</FormError>
        </label>)}
        <label className="text-sm font-medium">Tổ chức
          <select className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3" value={teamForm.organization_id} onChange={e=>setTeamForm(t=>({...t,organization_id:e.target.value}))}>
            <option value="">Chọn tổ chức</option>{management?.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select><FormError>{formErrors.organization_id}</FormError>
        </label>
        <label className="text-sm font-medium">Vai trò
          <select className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3" value={teamForm.role_code} onChange={e=>setTeamForm(t=>({...t,role_code:e.target.value}))}>
            {management?.roles.filter(x=>!['ADMIN','BOARD'].includes(x.code)).map(x=><option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
        </label>
      </div>
      <FormActions busy={busy} onCancel={()=>setTeamFormOpen(false)} onSave={()=>void createTeamMember()} saveLabel="Tạo tài khoản"/>
    </DialogContent>
  </Dialog>
  <Dialog open={teamDetail!==null} onOpenChange={open=>{if(!open)setTeamDetail(null);}}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Thông tin nhân sự</DialogTitle><DialogDescription>Chi tiết từ danh sách nhân sự được cấp quyền xem.</DialogDescription></DialogHeader>
      {teamDetail && <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Họ và tên</dt><dd className="font-semibold">{teamDetail.name}</dd>
        <dt className="text-muted-foreground">Email</dt><dd className="break-all">{teamDetail.email}</dd>
        <dt className="text-muted-foreground">Tổ chức</dt><dd>{teamDetail.organization_name}</dd>
        <dt className="text-muted-foreground">Vai trò</dt><dd>{management?.roles.find(r=>r.code===teamDetail.membership_type)?.name??teamDetail.membership_type}</dd>
        <dt className="text-muted-foreground">Trạng thái</dt><dd><AdminStatusBadge status={teamDetail.status} label={teamDetail.status==='ACTIVE'?'Hoạt động':teamDetail.status==='SUSPENDED'?'Tạm khóa':teamDetail.status}/></dd>
      </dl>}
      <div className="flex justify-end"><AppButton tone="outline" onClick={()=>setTeamDetail(null)}>Đóng</AppButton></div>
    </DialogContent>
  </Dialog>
</div>
  </AdminPageStatus>;
}
