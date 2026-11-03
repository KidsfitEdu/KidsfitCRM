'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Pencil, LockKeyhole, LockKeyholeOpen, Building2, UsersRound } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { Input } from '@/components/ui/input';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { FormActions } from '@/components/common/form-actions';
import { FormError } from '@/components/common/form-error';
import { appNotice } from '@/components/common/app-toast-provider';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import {
  fetchAdminManagement, createAdminTeamMember, updateAdminTeamMember,
  completeTeamHandover, reactivateTeam, createAdminPartner, updateAdminPartner,
} from '@/services/personnel.service';
import type { ChannelManagement } from '@/lib/channel-operations';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

type Person = ChannelManagement['team'][number];
type Partner = ChannelManagement['organizations'][number];
type StatusAction = { person: Person; suspend: boolean; account: boolean };
const blankCreate = {name:'',email:'',password:'',organization_id:'',role_code:'SALES',manager_user_id:''};
const blankPartner = {code:'',name:'',status:'ACTIVE' as 'ACTIVE'|'SUSPENDED',reason:''};
const roleNames: Record<string,string> = {
  ADMIN:'Quản trị viên',DIRECTOR:'Ban Giám Đốc',ACCOUNTANT:'Kế toán',
  SALES_MANAGER:'Quản lý bán hàng',CUSTOMER_SERVICE:'Chăm sóc khách hàng',
  SALES:'Sales / CTV',CHECKEE:'Xác minh CHECKEE',
};
const editableRoles = ['SALES','SALES_MANAGER','ACCOUNTANT','CUSTOMER_SERVICE','CHECKEE'];
const statusName = (status:string) => status === 'ACTIVE' ? 'Hoạt động' : status === 'SUSPENDED' ? 'Tạm khóa' : status;
const effectiveStatus = (person:Person,organizations:Partner[]) => {
  if(person.account_status==='SUSPENDED') return {status:'SUSPENDED',label:'Tài khoản bị khóa'};
  if(person.status==='SUSPENDED') return {status:'SUSPENDED',label:'Thành viên bị khóa'};
  if(organizations.find(o=>o.id===person.organization_id)?.status==='SUSPENDED') return {status:'SUSPENDED',label:'Tổ chức bị khóa'};
  return {status:'ACTIVE',label:'Hoạt động'};
};

export function PersonnelPage({apiBase,token,abilities}:AdminPageProps) {
  const [management,setManagement] = useState<ChannelManagement|null>(null);
  const [tab,setTab] = useState<'people'|'partners'>('people');
  const [draft,setDraft] = useState('');const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('ALL');
  const [page,setPage] = useState(1);const [pageSize,setPageSize] = useState(20);
  const [detail,setDetail] = useState<Person|null>(null);
  const [createOpen,setCreateOpen] = useState(false);
  const [createForm,setCreateForm] = useState(blankCreate);
  const [edit,setEdit] = useState<Person|null>(null);
  const [editForm,setEditForm] = useState({name:'',phone:'',role_code:'SALES',manager_user_id:'',reason:''});
  const [partnerDetail,setPartnerDetail] = useState<Partner|null>(null);
  const [partner,setPartner] = useState<Partner|null>(null);
  const [partnerOpen,setPartnerOpen] = useState(false);
  const [partnerForm,setPartnerForm] = useState(blankPartner);
  const [statusAction,setStatusAction] = useState<StatusAction|null>(null);
  const [reason,setReason] = useState('');
  const [partnerStatusAction,setPartnerStatusAction] = useState<{partner:Partner;suspend:boolean}|null>(null);
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState(false);
  const preview = !apiBase;
  const can = (permission:string) => abilities.includes('*') || abilities.includes(permission);
  const identity = can('channel_sales.identity.manage');
  const canTeam = can('channel_sales.team.manage');
  const canHandover = can('channel_sales.school.handover.manage');
  const reload = useCallback(async () => {
    if (preview || !token) return;
    setBusy(true);
    try { setManagement(await fetchAdminManagement(apiBase,token)); }
    catch (e) { appNotice.error('Không tải được nhân sự và đối tác.',e instanceof Error ? e.message : 'Thử lại sau.'); }
    finally { setBusy(false); }
  },[apiBase,token,preview]);
  useEffect(() => {void reload();},[reload]);

  const people = useMemo(() => management?.team.filter(p =>
    (filter==='ALL' || effectiveStatus(p,management?.organizations??[]).status===filter) &&
    [p.name,p.email,p.organization_name].some(v=>v.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))) ?? [],
    [management,filter,search]);
  const partners = useMemo(() => management?.organizations.filter(p =>
    (filter==='ALL' || (p.status ?? 'ACTIVE')===filter) &&
    [p.name,p.code].some(v=>v.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))) ?? [],
    [management,filter,search]);
  const rowsTotal = tab==='people'?people.length:partners.length;
  const managers = (organizationId:string) => management?.team.filter(p=>
    String(p.organization_id)===organizationId && p.status==='ACTIVE' &&
    p.account_status!=='SUSPENDED' && ['SALES_MANAGER','PARTNER_ADMIN'].includes(p.membership_type)) ?? [];
  const roleText=(role:string)=>roleNames[role]??management?.roles.find(r=>r.code===role)?.name??role;

  const run=async(task:()=>Promise<unknown>,success:string,close:()=>void)=>{
    setBusy(true);
    try{await task();close();setErrors({});appNotice.success(success);await reload();}
    catch(e){appNotice.error('Không thể hoàn tất thao tác.',e instanceof Error?e.message:'Vui lòng thử lại.');}
    finally{setBusy(false);}
  };
  const submitCreate=()=>{
    const err:Record<string,string>={};
    if(!createForm.name.trim())err.name='Cần nhập họ tên.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim()))err.email='Email không hợp lệ.';
    if(createForm.password.length<12)err.password='Mật khẩu ít nhất 12 ký tự.';
    if(!createForm.organization_id)err.organization_id='Chọn tổ chức.';
    if(createForm.role_code==='SALES' && !createForm.manager_user_id)err.manager_user_id='Chọn Quản lý bán hàng trực tiếp.';
    setErrors(err);if(Object.keys(err).length)return;
    void run(()=>createAdminTeamMember(apiBase,token,{
      name:createForm.name.trim(),email:createForm.email.trim(),password:createForm.password,
      organization_id:Number(createForm.organization_id),role_code:createForm.role_code,
      manager_user_id:createForm.manager_user_id?Number(createForm.manager_user_id):null,
    }), 'Đã tạo tài khoản.',()=>{setCreateOpen(false);setCreateForm(blankCreate);});
  };
  const openEdit=(p:Person)=>{
    setEdit(p);
    setEditForm({name:p.name,phone:p.phone??'',role_code:editableRoles.includes(p.membership_type)?p.membership_type:'SALES',
      manager_user_id:p.manager_user_id?String(p.manager_user_id):'',reason:''});
    setErrors({});
  };
  const submitEdit=()=>{
    if(!edit)return;
    const err:Record<string,string>={};
    if(!editForm.name.trim())err.name='Cần họ tên.';
    if(!editForm.reason.trim())err.reason='Cần lý do thay đổi.';
    if(editForm.role_code==='SALES' && !editForm.manager_user_id)err.manager_user_id='Chọn Quản lý trực tiếp.';
    setErrors(err);if(Object.keys(err).length)return;
    void run(()=>updateAdminTeamMember(apiBase,token,edit.id,{
      name:editForm.name.trim(),phone:editForm.phone.trim()||null,role_code:editForm.role_code,
      manager_user_id:editForm.manager_user_id?Number(editForm.manager_user_id):null,reason:editForm.reason.trim(),
    }),'Đã cập nhật nhân sự.',()=>setEdit(null));
  };
  const openPartner=(p:Partner|null)=>{
    setPartner(p);setPartnerForm(p?{code:p.code,name:p.name,status:(p.status==='SUSPENDED'?'SUSPENDED':'ACTIVE'),reason:''}:blankPartner);
    setErrors({});setPartnerOpen(true);
  };
  const submitPartner=()=>{
    const err:Record<string,string>={};
    if(!partner && !/^[A-Z0-9_-]{2,32}$/.test(partnerForm.code.trim().toUpperCase()))err.code='Mã từ 2–32 ký tự: A–Z, 0–9, - hoặc _.';
    if(!partnerForm.name.trim())err.name='Cần tên đối tác.';

    setErrors(err);if(Object.keys(err).length)return;
    const task=partner
      ?()=>updateAdminPartner(apiBase,token,partner.id,{name:partnerForm.name.trim(),status:partnerForm.status,reason:partnerForm.reason.trim()})
      :()=>createAdminPartner(apiBase,token,{code:partnerForm.code.trim().toUpperCase(),name:partnerForm.name.trim()});
    void run(task,partner?'Đã cập nhật đối tác.':'Đã tạo đối tác.',()=>setPartnerOpen(false));
  };
  const submitStatus=()=>{
    if(!statusAction)return;
    if(statusAction.suspend && !reason.trim()){setErrors({reason:'Cần lý do.'});return;}
    const {person,suspend,account}=statusAction;
    const task=suspend
      ?()=>completeTeamHandover(apiBase,token,person.id,{
          idempotency_key:crypto.randomUUID(),reason:reason.trim(),summary:'',suspend_account:false,
        })
      :()=>reactivateTeam(apiBase,token,person.id,{reason:'',reactivate_account:account});
    void run(task,suspend?'Đã khóa thành viên.':'Đã mở khóa thành viên.',()=>{setStatusAction(null);setReason('');});
  };
  const chooseStatus=(person:Person,suspend:boolean)=>{
    setStatusAction({person,suspend,account:!suspend&&person.account_status==='SUSPENDED'});
    setReason('');setErrors({});
  };
  const submitPartnerStatus=()=>{
    if(!partnerStatusAction)return;
    const {partner,suspend}=partnerStatusAction;
    if(suspend&&!reason.trim()){setErrors({reason:'Cần lý do.'});return;}
    void run(()=>updateAdminPartner(apiBase,token,partner.id,{
      name:partner.name,status:suspend?'SUSPENDED':'ACTIVE',reason:suspend?reason.trim():'',
    }),suspend?'Đã khóa tổ chức.':'Đã mở khóa tổ chức.',()=>{
      setPartnerStatusAction(null);setReason('');
    });
  };
  const reset=()=>{setDraft('');setSearch('');setFilter('ALL');setPage(1);};
  return <AdminPageStatus apiBase={apiBase}>
    <div className="space-y-5">
      <AppPageHeader eyebrow="QUẢN TRỊ / NHÂN SỰ & ĐỐI TÁC" title="Nhân sự & đối tác"
        description="Hồ sơ nhân sự, tổ chức, phân quyền và trạng thái truy cập."
        actions={<AppButton tone="green" premium leadingIcon={<Plus className="size-4"/>}
          disabled={preview||(tab==='people'?!canTeam:!identity)} onClick={()=>{setErrors({});if(tab==='people'){setCreateForm(blankCreate);setCreateOpen(true);}else openPartner(null);}}>
          {tab==='people'?'Thêm nhân sự':'Thêm đối tác'}
        </AppButton>}/>
      <div role="tablist" aria-label="Quản lý nhân sự và đối tác" className="flex gap-4 border-b">
        <button role="tab" aria-selected={tab==='people'} onClick={()=>{setTab('people');reset();}}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab==='people'?'border-green-700 text-green-800':'border-transparent text-muted-foreground'}`}>
          <UsersRound className="size-4"/> Nhân sự
        </button>
        <button role="tab" aria-selected={tab==='partners'} onClick={()=>{setTab('partners');reset();}}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab==='partners'?'border-green-700 text-green-800':'border-transparent text-muted-foreground'}`}>
          <Building2 className="size-4"/> Đối tác / Tổ chức
        </button>
      </div>
      <AdminListPanel>
        <AdminListToolbar search={draft} onSearchChange={setDraft}
          onSearch={()=>{setSearch(draft.trim());setPage(1);}} onReset={reset}
          placeholder={tab==='people'?'Tên nhân sự, email, tổ chức...':'Tên hoặc mã tổ chức...'}
          searchLabel={tab==='people'?'Tìm nhân sự':'Tìm đối tác'}
          filters={<AppNativeSelect aria-label="Lọc trạng thái" value={filter} containerClassName="w-full sm:w-48"
            onChange={e=>{setFilter(e.target.value);setPage(1);}}>
            <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="SUSPENDED">Tạm khóa</option>
          </AppNativeSelect>}/>
        <div className="overflow-x-auto">
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}>
              {tab==='people'?<tr>
                <th className="px-5 py-4">Nhân sự</th><th className="px-5 py-4">Tổ chức</th>
                <th className="px-5 py-4">Vai trò</th><th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>:<tr><th className="px-5 py-4">Đối tác / Tổ chức</th>
                <th className="px-5 py-4">Loại hình</th><th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th></tr>}
            </thead>
            <tbody>
              {tab==='people' && people.slice((page-1)*pageSize,page*pageSize).map(p=><tr key={p.id} className="border-t even:bg-muted/20 hover:bg-accent">
                <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.email}</p></td>
                <td className="px-5 py-4">{p.organization_name}</td>
                <td className="px-5 py-4">{roleText(p.membership_type)}</td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge {...effectiveStatus(p,management?.organizations??[])}/></td>
                <td className="px-5 py-4"><div className="flex flex-wrap justify-end gap-2">
                  <AdminIconAction icon={Eye} label={`Xem ${p.name}`} onClick={()=>setDetail(p)}/>
                  {identity && p.can_edit && <AdminIconAction icon={Pencil} tone="blue" label={`Sửa ${p.name}`} onClick={()=>openEdit(p)}/>}
                  {p.can_change_status && canHandover &&
                    (p.status==='ACTIVE' && p.account_status!=='SUSPENDED'
                    ?<AdminIconAction icon={LockKeyhole} tone="red" label={`Khóa thành viên ${p.name}`}
                        onClick={()=>chooseStatus(p,true)}/>
                    :<AdminIconAction icon={LockKeyholeOpen} tone="green" label={`Mở khóa thành viên ${p.name}`}
                        disabled={management?.organizations.find(o=>o.id===p.organization_id)?.status==='SUSPENDED'}
                        onClick={()=>chooseStatus(p,false)}/>)}
                </div></td>
              </tr>)}
              {tab==='partners'&&partners.slice((page-1)*pageSize,page*pageSize).map(p=><tr key={p.id} className="border-t even:bg-muted/20 hover:bg-accent">
                <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.code}</p></td>
                <td className="px-5 py-4">{p.organization_type??'PARTNER'}</td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status??'ACTIVE'} label={statusName(p.status??'ACTIVE')}/></td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2">
                  <AdminIconAction icon={Eye} label={`Xem tổ chức ${p.name}`} onClick={()=>setPartnerDetail(p)}/>
                  {identity && p.organization_type==='PARTNER'&&<>
                    <AdminIconAction icon={Pencil} tone="blue" label={`Chỉnh sửa ${p.name}`} onClick={()=>openPartner(p)}/>
                    <AdminIconAction icon={p.status==='SUSPENDED'?LockKeyholeOpen:LockKeyhole}
                      tone={p.status==='SUSPENDED'?'green':'red'}
                      label={p.status==='SUSPENDED'?`Mở khóa tổ chức ${p.name}`:`Khóa tổ chức ${p.name}`}
                      onClick={()=>{setPartnerStatusAction({partner:p,suspend:p.status!=='SUSPENDED'});setReason('');setErrors({});}}/>
                  </>}
                </div></td>
              </tr>)}
            </tbody>
          </table>
          {management && rowsTotal===0 && <p className="p-8 text-center text-sm text-muted-foreground">Không có dữ liệu phù hợp.</p>}
          {!management && <p className="p-8 text-center text-sm text-muted-foreground">{busy?'Đang tải dữ liệu…':'Chưa có dữ liệu hoặc chưa đủ quyền.'}</p>}
        </div>
        {management&&<AppPagination page={page} pageSize={pageSize} total={rowsTotal}
          showSummary={false} pageSizeOptions={[10,20,50,100]}
          onPageChange={setPage} onPageSizeChange={v=>{setPageSize(v);setPage(1);}}/>}
      </AdminListPanel>

      <AppDialog open={createOpen} onOpenChange={open=>{if(!busy)setCreateOpen(open);}}
        busy={busy} title="Thêm nhân sự" description="Tạo tài khoản đúng tổ chức và vai trò. Không cấp quyền Admin/BGĐ."
        footer={<FormActions busy={busy} onCancel={()=>setCreateOpen(false)} onSave={submitCreate} saveLabel="Tạo tài khoản"/>}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-new-name">Họ và tên *</label>
            <Input id="admin-new-name" autoComplete="name" className="h-11" value={createForm.name}
              aria-invalid={!!errors.name} onChange={e=>setCreateForm(v=>({...v,name:e.target.value}))}/>
            <FormError>{errors.name}</FormError>
          </div>
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-new-email">Email *</label>
            <Input id="admin-new-email" type="email" autoComplete="email" className="h-11" value={createForm.email}
              aria-invalid={!!errors.email} onChange={e=>setCreateForm(v=>({...v,email:e.target.value}))}/>
            <FormError>{errors.email}</FormError>
          </div>
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-new-org">Tổ chức *</label>
            <AppNativeSelect id="admin-new-org" containerClassName="w-full" value={createForm.organization_id}
              onChange={e=>setCreateForm(v=>({...v,organization_id:e.target.value,manager_user_id:'',
                role_code:management?.organizations.find(o=>String(o.id)===e.target.value)?.organization_type==='CHECKEE'?'CHECKEE':'SALES'}))}>
              <option value="">Chọn tổ chức</option>
              {management?.organizations.filter(o=>o.status==='ACTIVE').map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </AppNativeSelect>
            <FormError>{errors.organization_id}</FormError>
          </div>
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-new-role">Vai trò *</label>
            <AppNativeSelect id="admin-new-role" containerClassName="w-full" value={createForm.role_code}
              onChange={e=>setCreateForm(v=>({...v,role_code:e.target.value,manager_user_id:''}))}>
              {management?.roles.filter(r=>editableRoles.includes(r.code) &&
                (r.code==='CHECKEE')===(management.organizations.find(o=>String(o.id)===createForm.organization_id)?.organization_type==='CHECKEE'))
                .map(r=><option key={r.code} value={r.code}>{roleText(r.code)}</option>)}
            </AppNativeSelect>
          </div>
          {createForm.role_code==='SALES' && <div className="min-w-0 space-y-1.5 text-sm font-medium sm:col-span-2">
            <label htmlFor="admin-new-manager">Quản lý bán hàng trực tiếp *</label>
            <AppNativeSelect id="admin-new-manager" containerClassName="w-full" value={createForm.manager_user_id}
              onChange={e=>setCreateForm(v=>({...v,manager_user_id:e.target.value}))}>
              <option value="">Chọn Quản lý</option>
              {managers(createForm.organization_id).map(p=><option key={p.user_id} value={p.user_id}>{p.name}</option>)}
            </AppNativeSelect>
            <FormError>{errors.manager_user_id}</FormError>
          </div>}
          <div className="min-w-0 space-y-1.5 text-sm font-medium sm:col-span-2">
            <label htmlFor="admin-new-password">Mật khẩu ban đầu (ít nhất 12 ký tự) *</label>
            <Input id="admin-new-password" type="password" autoComplete="new-password" className="h-11"
              value={createForm.password} aria-invalid={!!errors.password}
              onChange={e=>setCreateForm(v=>({...v,password:e.target.value}))}/>
            <FormError>{errors.password}</FormError>
          </div>
        </div>
      </AppDialog>
      <AppDialog open={edit!==null} onOpenChange={open=>{if(!busy&&!open)setEdit(null);}}
        busy={busy} title="Chỉnh sửa nhân sự" description="Thay đổi vai trò chỉ áp dụng sau khi backend kiểm tra quyền và dữ liệu bàn giao."
        footer={<FormActions busy={busy} onCancel={()=>setEdit(null)} onSave={submitEdit} saveLabel="Lưu thay đổi"/>}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-edit-name">Họ và tên *</label>
            <Input id="admin-edit-name" className="h-11" value={editForm.name} onChange={e=>setEditForm(v=>({...v,name:e.target.value}))}/>
            <FormError>{errors.name}</FormError>
          </div>
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-edit-phone">Điện thoại</label>
            <Input id="admin-edit-phone" className="h-11" value={editForm.phone} onChange={e=>setEditForm(v=>({...v,phone:e.target.value}))}/>
          </div>
          <div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-edit-role">Vai trò *</label>
            <AppNativeSelect id="admin-edit-role" containerClassName="w-full" value={editForm.role_code}
              onChange={e=>setEditForm(v=>({...v,role_code:e.target.value,manager_user_id:''}))}>
              {management?.roles.filter(r=>editableRoles.includes(r.code) &&
                (r.code==='CHECKEE')===(management.organizations.find(o=>o.id===edit?.organization_id)?.organization_type==='CHECKEE'))
                .map(r=><option key={r.code} value={r.code}>{roleText(r.code)}</option>)}
            </AppNativeSelect>
          </div>
          {editForm.role_code==='SALES'&&<div className="min-w-0 space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-edit-manager">Quản lý trực tiếp *</label>
            <AppNativeSelect id="admin-edit-manager" containerClassName="w-full" value={editForm.manager_user_id}
              onChange={e=>setEditForm(v=>({...v,manager_user_id:e.target.value}))}>
              <option value="">Chọn Quản lý</option>
              {managers(String(edit?.organization_id??'')).map(p=><option key={p.user_id} value={p.user_id}>{p.name}</option>)}
            </AppNativeSelect>
            <FormError>{errors.manager_user_id}</FormError>
          </div>}
          <div className="min-w-0 space-y-1.5 text-sm font-medium sm:col-span-2">
            <label htmlFor="admin-edit-reason">Lý do thay đổi *</label>
            <Input id="admin-edit-reason" className="h-11" value={editForm.reason}
              onChange={e=>setEditForm(v=>({...v,reason:e.target.value}))}/>
            <FormError>{errors.reason}</FormError>
          </div>
        </div>
      </AppDialog>
      <AppDialog open={partnerOpen} onOpenChange={open=>{if(!busy)setPartnerOpen(open);}}
        busy={busy} contentClassName="sm:max-w-md" title={partner?'Cập nhật đối tác':'Thêm đối tác'}
        description="Chỉ tổ chức đối tác được phép thay đổi; không sửa KIDSFIT/CHECKEE."
        footer={<FormActions busy={busy} onCancel={()=>setPartnerOpen(false)} onSave={submitPartner}
          saveLabel={partner?'Lưu đối tác':'Tạo đối tác'}/>}>
        <div className="space-y-4">
          {!partner&&<div className="space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-partner-code">Mã đối tác *</label>
            <Input id="admin-partner-code" className="h-11" value={partnerForm.code}
              onChange={e=>setPartnerForm(v=>({...v,code:e.target.value}))}/>
            <FormError>{errors.code}</FormError>
          </div>}
          <div className="space-y-1.5 text-sm font-medium">
            <label htmlFor="admin-partner-name">Tên đối tác *</label>
            <Input id="admin-partner-name" className="h-11" value={partnerForm.name}
              onChange={e=>setPartnerForm(v=>({...v,name:e.target.value}))}/>
            <FormError>{errors.name}</FormError>
          </div>
        </div>
      </AppDialog>
      <AppDrawer open={partnerDetail!==null} onOpenChange={open=>{if(!open)setPartnerDetail(null);}}
        title="Thông tin tổ chức" description="Hồ sơ và thành viên trong tổ chức">
        {partnerDetail&&<div className="space-y-5 text-sm">
          <dl className="grid grid-cols-[125px_1fr] gap-3">
            <dt className="text-muted-foreground">Tên tổ chức</dt><dd>{partnerDetail.name}</dd>
            <dt className="text-muted-foreground">Mã tổ chức</dt><dd>{partnerDetail.code}</dd>
            <dt className="text-muted-foreground">Loại hình</dt><dd>{partnerDetail.organization_type??'PARTNER'}</dd>
            <dt className="text-muted-foreground">Trạng thái</dt><dd>{statusName(partnerDetail.status??'ACTIVE')}</dd>
          </dl>
          <h3 className="font-semibold">Thành viên thuộc tổ chức</h3>
          {management?.team.filter(p=>p.organization_id===partnerDetail.id).map(p=>
            <div key={p.id} className="rounded-lg border p-3">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.email} · {roleText(p.membership_type)}</p>
              <p className="mt-1 text-xs">{effectiveStatus(p,management.organizations).label}</p>
            </div>)}
          {!management?.team.some(p=>p.organization_id===partnerDetail.id)&&
            <p className="text-muted-foreground">Chưa có thành viên.</p>}
        </div>}
      </AppDrawer>
      <AppDrawer open={detail!==null} onOpenChange={open=>{if(!open)setDetail(null);}}
        title="Thông tin nhân sự" description="Trạng thái tài khoản và tư cách thành viên được quản lý riêng.">
        {detail&&<dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Họ tên</dt><dd>{detail.name}</dd>
          <dt className="text-muted-foreground">Email</dt><dd className="break-all">{detail.email}</dd>
          <dt className="text-muted-foreground">Số điện thoại</dt><dd>{detail.phone||'Chưa cập nhật'}</dd>
          <dt className="text-muted-foreground">Tổ chức</dt><dd>{detail.organization_name}</dd>
          <dt className="text-muted-foreground">Vai trò</dt><dd>{roleText(detail.membership_type)}</dd>
          <dt className="text-muted-foreground">Quản lý trực tiếp</dt><dd>{management?.team.find(p=>p.user_id===detail.manager_user_id)?.name||'Chưa phân công'}</dd>
          <dt className="text-muted-foreground">Thành viên</dt><dd>{statusName(detail.status)}</dd>
          <dt className="text-muted-foreground">Tài khoản</dt><dd>{statusName(detail.account_status??'ACTIVE')}</dd>
        </dl>}
        <div className="mt-5 flex justify-end"><AppButton tone="outline" onClick={()=>setDetail(null)}>Đóng</AppButton></div>
      </AppDrawer>
      <ConfirmDialog open={statusAction!==null} onOpenChange={open=>{if(!busy&&!open)setStatusAction(null);}}
        busy={busy} destructive={Boolean(statusAction?.suspend)}
        title={statusAction?.suspend?'Xác nhận khóa truy cập':'Xác nhận mở khóa'}
        compactHeader={!statusAction?.suspend}
        confirmLabel={statusAction?.suspend?'Khóa truy cập':'Xác nhận'} onConfirm={submitStatus}>
        {!statusAction?.suspend && <p>Bạn có chắc chắn muốn mở khóa thành viên này không?</p>}
        {statusAction?.suspend&&<div className="block text-sm font-medium">Lý do *
          <Input aria-label="Lý do khóa truy cập" className="mt-1.5" value={reason}
            onChange={e=>setReason(e.target.value)}/>
          <FormError>{errors.reason}</FormError>
        </div>}
      </ConfirmDialog>
      <ConfirmDialog open={partnerStatusAction!==null} onOpenChange={open=>{if(!busy&&!open)setPartnerStatusAction(null);}}
        busy={busy} destructive={Boolean(partnerStatusAction?.suspend)}
        title={partnerStatusAction?.suspend?'Xác nhận khóa tổ chức':'Xác nhận mở khóa tổ chức'}
        compactHeader={!partnerStatusAction?.suspend}
        confirmLabel={partnerStatusAction?.suspend?'Khóa tổ chức':'Xác nhận'} onConfirm={submitPartnerStatus}>
        {!partnerStatusAction?.suspend && <p>Bạn có chắc chắn muốn mở khóa tổ chức này không?</p>}
        {partnerStatusAction?.suspend&&<div className="block text-sm font-medium">Lý do *
          <Input aria-label="Lý do khóa tổ chức" className="mt-1.5" value={reason}
            onChange={e=>setReason(e.target.value)}/>
          <FormError>{errors.reason}</FormError>
        </div>}
      </ConfirmDialog>
    </div>
  </AdminPageStatus>;
}
