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
  const [partner,setPartner] = useState<Partner|null>(null);
  const [partnerOpen,setPartnerOpen] = useState(false);
  const [partnerForm,setPartnerForm] = useState(blankPartner);
  const [statusAction,setStatusAction] = useState<StatusAction|null>(null);
  const [reason,setReason] = useState('');const [summary,setSummary] = useState('');
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
    (filter==='ALL' || p.status===filter || p.account_status===filter) &&
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
    if(partner && !partnerForm.reason.trim())err.reason='Cần lý do thay đổi.';
    setErrors(err);if(Object.keys(err).length)return;
    const task=partner
      ?()=>updateAdminPartner(apiBase,token,partner.id,{name:partnerForm.name.trim(),status:partnerForm.status,reason:partnerForm.reason.trim()})
      :()=>createAdminPartner(apiBase,token,{code:partnerForm.code.trim().toUpperCase(),name:partnerForm.name.trim()});
    void run(task,partner?'Đã cập nhật đối tác.':'Đã tạo đối tác.',()=>setPartnerOpen(false));
  };
  const submitStatus=()=>{
    if(!statusAction || !reason.trim() || (statusAction.suspend && !summary.trim())){
      setErrors({reason:!reason.trim()?'Cần lý do.':'',summary:statusAction?.suspend&&!summary.trim()?'Cần nội dung bàn giao.':''});return;
    }
    const {person,suspend,account}=statusAction;
    const task=suspend
      ?()=>completeTeamHandover(apiBase,token,person.id,{
          idempotency_key:crypto.randomUUID(),reason:reason.trim(),summary:summary.trim(),suspend_account:account,
        })
      :()=>reactivateTeam(apiBase,token,person.id,{reason:reason.trim(),reactivate_account:account});
    void run(task,suspend?'Đã khóa và lưu bàn giao.':'Đã mở lại quyền truy cập.',()=>{setStatusAction(null);setReason('');setSummary('');});
  };
  const chooseStatus=(person:Person,suspend:boolean,account:boolean)=>{
    setStatusAction({person,suspend,account});setReason('');setSummary('');setErrors({});
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
                <th className="px-5 py-4">Nhân sự</th><th className="px-5 py-4">Tổ chức / Vai trò</th>
                <th className="px-5 py-4 text-center">Thành viên</th><th className="px-5 py-4 text-center">Tài khoản</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>:<tr><th className="px-5 py-4">Đối tác / Tổ chức</th>
                <th className="px-5 py-4">Loại hình</th><th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th></tr>}
            </thead>
            <tbody>
              {tab==='people' && people.slice((page-1)*pageSize,page*pageSize).map(p=><tr key={p.id} className="border-t even:bg-muted/20 hover:bg-accent">
                <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.email}</p></td>
                <td className="px-5 py-4">{p.organization_name}<p className="mt-1 text-xs text-muted-foreground">{roleText(p.membership_type)}</p></td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status} label={statusName(p.status)}/></td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.account_status??'ACTIVE'} label={statusName(p.account_status??'ACTIVE')}/></td>
                <td className="px-5 py-4"><div className="flex flex-wrap justify-end gap-2">
                  <AdminIconAction icon={Eye} label={`Xem ${p.name}`} onClick={()=>setDetail(p)}/>
                  {identity && p.can_edit && <AdminIconAction icon={Pencil} tone="blue" label={`Sửa ${p.name}`} onClick={()=>openEdit(p)}/>}
                  {p.can_change_status && canHandover && (p.status==='ACTIVE'
                    ?<AdminIconAction icon={LockKeyhole} tone="red" label={`Khóa quyền tại tổ chức: ${p.name}`} onClick={()=>chooseStatus(p,true,false)}/>
                    :<AdminIconAction icon={LockKeyholeOpen} label={`Mở quyền tại tổ chức: ${p.name}`} onClick={()=>chooseStatus(p,false,false)} disabled={p.account_status==='SUSPENDED'}/>)}
                  {identity && p.can_edit && canHandover && p.status==='ACTIVE' && p.account_status!=='SUSPENDED' &&
                    <AdminIconAction icon={LockKeyhole} tone="red" label={`Khóa toàn tài khoản ${p.name}`} onClick={()=>chooseStatus(p,true,true)}/>}
                  {identity && p.can_edit && canHandover && p.account_status==='SUSPENDED' &&
                    <AdminIconAction icon={LockKeyholeOpen} tone="green" label={`Mở toàn tài khoản ${p.name}`} onClick={()=>chooseStatus(p,false,true)}/>}
                </div></td>
              </tr>)}
              {tab==='partners'&&partners.slice((page-1)*pageSize,page*pageSize).map(p=><tr key={p.id} className="border-t even:bg-muted/20 hover:bg-accent">
                <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.code}</p></td>
                <td className="px-5 py-4">{p.organization_type??'PARTNER'}</td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status??'ACTIVE'} label={statusName(p.status??'ACTIVE')}/></td>
                <td className="px-5 py-4"><div className="flex justify-end">
                  {identity && p.organization_type==='PARTNER'&&<AdminIconAction icon={Pencil} tone="blue" label={`Chỉnh sửa ${p.name}`} onClick={()=>openPartner(p)}/>}
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
        busy={busy} title="Thêm nhân sự" description="Tạo tài khoản đúng tổ chức và vai trò. Không cấp quyền Admin/BGĐ.">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['name','email','password'] as const).map(k=><div key={k} className="text-sm font-medium">
            <span>{({name:'Họ và tên',email:'Email',password:'Mật khẩu ban đầu (ít nhất 12 ký tự)'} as const)[k]}</span>
            <Input aria-label={k==='name'?'Họ và tên':k==='email'?'Email':'Mật khẩu ban đầu'}
              type={k==='password'?'password':'text'} className="mt-1.5" value={createForm[k]} aria-invalid={!!errors[k]}
              onChange={e=>setCreateForm(v=>({...v,[k]:e.target.value}))}/><FormError>{errors[k]}</FormError>
          </div>)}
          <div className="text-sm font-medium"><span>Tổ chức</span>
            <AppNativeSelect aria-label="Tổ chức" className="mt-1.5 w-full" value={createForm.organization_id}
              onChange={e=>setCreateForm(v=>({...v,organization_id:e.target.value,manager_user_id:'',
                role_code:management?.organizations.find(o=>String(o.id)===e.target.value)?.organization_type==='CHECKEE'?'CHECKEE':'SALES'}))}>
              <option value="">Chọn tổ chức</option>
              {management?.organizations.filter(o=>o.status==='ACTIVE').map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </AppNativeSelect><FormError>{errors.organization_id}</FormError>
          </div>
          <div className="text-sm font-medium"><span>Vai trò</span>
            <AppNativeSelect aria-label="Vai trò" className="mt-1.5 w-full" value={createForm.role_code}
              onChange={e=>setCreateForm(v=>({...v,role_code:e.target.value}))}>
              {management?.roles.filter(r=>editableRoles.includes(r.code) &&
                (r.code==='CHECKEE')===(management.organizations.find(o=>String(o.id)===createForm.organization_id)?.organization_type==='CHECKEE'))
                .map(r=><option key={r.code} value={r.code}>{roleText(r.code)}</option>)}
            </AppNativeSelect>
          </div>
          {createForm.role_code==='SALES' && <div className="text-sm font-medium"><span>Quản lý bán hàng trực tiếp</span>
            <AppNativeSelect aria-label="Quản lý bán hàng trực tiếp" className="mt-1.5 w-full" value={createForm.manager_user_id}
              onChange={e=>setCreateForm(v=>({...v,manager_user_id:e.target.value}))}>
              <option value="">Chọn Quản lý</option>{managers(createForm.organization_id).map(p=><option key={p.user_id} value={p.user_id}>{p.name}</option>)}
            </AppNativeSelect><FormError>{errors.manager_user_id}</FormError>
          </div>}
        </div>
        <FormActions busy={busy} onCancel={()=>setCreateOpen(false)} onSave={submitCreate} saveLabel="Tạo tài khoản"/>
      </AppDialog>
      <AppDialog open={edit!==null} onOpenChange={open=>{if(!busy&&!open)setEdit(null);}}
        busy={busy} title="Chỉnh sửa nhân sự" description="Thay đổi vai trò chỉ áp dụng sau khi backend kiểm tra quyền và dữ liệu bàn giao.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Họ và tên<Input className="mt-1.5" value={editForm.name} onChange={e=>setEditForm(v=>({...v,name:e.target.value}))}/><FormError>{errors.name}</FormError></label>
          <label className="text-sm font-medium">Điện thoại<Input className="mt-1.5" value={editForm.phone} onChange={e=>setEditForm(v=>({...v,phone:e.target.value}))}/></label>
          <div className="text-sm font-medium"><span>Vai trò</span>
            <AppNativeSelect aria-label="Vai trò nhân sự" className="mt-1.5 w-full" value={editForm.role_code} onChange={e=>setEditForm(v=>({...v,role_code:e.target.value}))}>
              {management?.roles.filter(r=>editableRoles.includes(r.code) &&
                (r.code==='CHECKEE')===(management.organizations.find(o=>o.id===edit?.organization_id)?.organization_type==='CHECKEE'))
                .map(r=><option key={r.code} value={r.code}>{roleText(r.code)}</option>)}
            </AppNativeSelect>
          </div>
          {editForm.role_code==='SALES'&&<div className="text-sm font-medium"><span>Quản lý trực tiếp</span>
            <AppNativeSelect aria-label="Quản lý trực tiếp" className="mt-1.5 w-full" value={editForm.manager_user_id} onChange={e=>setEditForm(v=>({...v,manager_user_id:e.target.value}))}>
              <option value="">Chọn Quản lý</option>{managers(String(edit?.organization_id??'')).map(p=><option key={p.user_id} value={p.user_id}>{p.name}</option>)}
            </AppNativeSelect><FormError>{errors.manager_user_id}</FormError>
          </div>}
          <label className="text-sm font-medium sm:col-span-2">Lý do thay đổi<Input className="mt-1.5" value={editForm.reason} onChange={e=>setEditForm(v=>({...v,reason:e.target.value}))}/><FormError>{errors.reason}</FormError></label>
        </div>
        <FormActions busy={busy} onCancel={()=>setEdit(null)} onSave={submitEdit} saveLabel="Lưu thay đổi"/>
      </AppDialog>
      <AppDialog open={partnerOpen} onOpenChange={open=>{if(!busy)setPartnerOpen(open);}}
        busy={busy} title={partner?'Cập nhật đối tác':'Thêm đối tác'} description="Chỉ tổ chức đối tác được phép thay đổi; không sửa KIDSFIT/CHECKEE.">
        <div className="space-y-3">
          {!partner&&<label className="block text-sm font-medium">Mã đối tác<Input className="mt-1.5" value={partnerForm.code} onChange={e=>setPartnerForm(v=>({...v,code:e.target.value}))}/><FormError>{errors.code}</FormError></label>}
          <label className="block text-sm font-medium">Tên đối tác<Input className="mt-1.5" value={partnerForm.name} onChange={e=>setPartnerForm(v=>({...v,name:e.target.value}))}/><FormError>{errors.name}</FormError></label>
          {partner&&<>
            <div className="block text-sm font-medium"><span>Trạng thái</span>
              <AppNativeSelect aria-label="Trạng thái đối tác" className="mt-1.5 w-full" value={partnerForm.status} onChange={e=>setPartnerForm(v=>({...v,status:e.target.value as 'ACTIVE'|'SUSPENDED'}))}>
                <option value="ACTIVE">Hoạt động</option><option value="SUSPENDED">Tạm khóa</option>
              </AppNativeSelect>
            </div>
            <label className="block text-sm font-medium">Lý do<Input className="mt-1.5" value={partnerForm.reason} onChange={e=>setPartnerForm(v=>({...v,reason:e.target.value}))}/><FormError>{errors.reason}</FormError></label>
          </>}
        </div>
        <FormActions busy={busy} onCancel={()=>setPartnerOpen(false)} onSave={submitPartner} saveLabel={partner?'Lưu đối tác':'Tạo đối tác'}/>
      </AppDialog>
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
        title={statusAction?.suspend?'Xác nhận khóa truy cập':'Xác nhận mở quyền'}
        description={statusAction?.account
          ?'Tác động đến toàn tài khoản. Cần hoàn tất bàn giao ở mọi tổ chức trước khi khóa.'
          :'Chỉ tác động tư cách thành viên ở tổ chức hiện tại. Trường đang tiếp cận và yêu cầu chờ được xử lý theo quy trình bàn giao.'}
        confirmLabel={statusAction?.suspend?'Khóa và bàn giao':'Mở quyền'} onConfirm={submitStatus}>
        <label className="block text-sm font-medium">Lý do *
          <Input className="mt-1.5" value={reason} onChange={e=>setReason(e.target.value)}/>
          <FormError>{errors.reason}</FormError>
        </label>
        {statusAction?.suspend&&<label className="block text-sm font-medium">Nội dung bàn giao *
          <textarea className="mt-1.5 min-h-24 w-full rounded-lg border bg-background p-3"
            value={summary} onChange={e=>setSummary(e.target.value)}
            placeholder="Tình trạng các trường, lịch hẹn, người nhận bàn giao và cam kết còn lại"/>
          <FormError>{errors.summary}</FormError>
        </label>}
      </ConfirmDialog>
    </div>
  </AdminPageStatus>;
}
