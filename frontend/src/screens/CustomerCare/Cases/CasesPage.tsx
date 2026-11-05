'use client';

import {useEffect,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Plus,Eye,Search,ChevronDown,Check} from 'lucide-react';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AdminListPanel,AdminListToolbar,AdminIconAction,AdminStatusBadge,adminTableClass,adminTableHeadClass,adminTableCellClass} from '@/components/common/admin-list-ui';
import {AppPagination} from '@/components/common/app-pagination';
import {AppDialog} from '@/components/common/dialogs/app-dialog';
import {AppDrawer} from '@/components/common/drawers/app-drawer';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';
import {SupportTicketSummary,SupportTicketTimeline} from '@/components/common/support-ticket-detail';

type Ticket={id:number;contract_id:number;customer_id:number;subject:string;description:string;status:string;
  ticket_type:string;checkee_responded_at:string|null;outcome:string|null;created_at:string;school_name:string;
  activities:{id:number;content:string;activity_type:string;created_at:string;next_follow_up_at:string|null;author_name:string|null;author_role:string}[]};
type TicketList={data:Ticket[];total:number;page:number;page_size:number};
type School={id:number;customer_id:number;school_name:string;eligible_contract_count:number};
type SchoolList={data:School[];total:number};
export function CasesPage({apiBase,token,abilities,onChanged}:RolePageProps){
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const [draft,setDraft]=useState('');const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [creating,setCreating]=useState(false);
  const [schoolSearch,setSchoolSearch]=useState('');
  const [debouncedSchoolSearch,setDebouncedSchoolSearch]=useState('');
  const [schoolPage,setSchoolPage]=useState(1);
  const [selectedSchoolName,setSelectedSchoolName]=useState('');
  const [schoolOpen,setSchoolOpen]=useState(false);
  const [schoolError,setSchoolError]=useState('');
  const [fieldErrors,setFieldErrors]=useState<{school?:string;subject?:string;description?:string}>({});
  const [schoolActiveIndex,setSchoolActiveIndex]=useState(-1);
  const schoolInputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const timeout=setTimeout(()=>setDebouncedSchoolSearch(schoolSearch.trim()),250);
    return ()=>clearTimeout(timeout);
  },[schoolSearch]);
  const [contractId,setContractId]=useState('');const [subject,setSubject]=useState('');const [description,setDescription]=useState('');
  const [selected,setSelected]=useState<Ticket|null>(null);const [progress,setProgress]=useState('');
  const [nextStatus,setNextStatus]=useState('IN_PROGRESS');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['care-ticket-list',token,page,pageSize,search,status],
    queryFn:()=>channelRequest<TicketList>(apiBase,token,'/care/tickets?page='+page+'&page_size='+pageSize
      +'&status='+status+'&search='+encodeURIComponent(search)),
    enabled:!!apiBase&&!!token&&allowed});
  const schools=useQuery({queryKey:['care-ticket-schools',token,debouncedSchoolSearch,schoolPage],
    queryFn:()=>channelRequest<SchoolList>(apiBase,token,
      '/care/schools?page='+schoolPage+'&page_size=50&search='+encodeURIComponent(debouncedSchoolSearch)),
    enabled:!!apiBase&&!!token&&allowed&&creating});
  const schoolChoices=schools.data?.data??[];
  const selectSchool=(school:School)=>{
    if(school.eligible_contract_count > 1){
      setSchoolError('Trường có nhiều hợp đồng đang hỗ trợ. Vui lòng liên hệ Quản lý để xác định hợp đồng phù hợp.');
      setContractId('');return;
    }
    setContractId(String(school.id));setSelectedSchoolName(school.school_name);
    setSchoolSearch(school.school_name);setSchoolOpen(false);
    setSchoolError('');setFieldErrors(prev=>({...prev,school:undefined}));
  };
  const startSearch=(value:string)=>{
    setSchoolSearch(value);setContractId('');setSelectedSchoolName('');
    setSchoolPage(1);setSchoolOpen(true);setSchoolActiveIndex(-1);setSchoolError('');
  };
  const reload=async()=>{await Promise.all([client.invalidateQueries({queryKey:['care-ticket-list']}),onChanged()]);};
  const create=async()=>{
    const nextErrors:{school?:string;subject?:string;description?:string}={};
    if(!contractId)nextErrors.school=schoolError||'Vui lòng chọn trường cần hỗ trợ.';
    if(!subject.trim())nextErrors.subject='Vui lòng nhập tiêu đề lỗi.';
    else if(subject.trim().length>190)nextErrors.subject='Tiêu đề tối đa 190 ký tự.';
    if(!description.trim())nextErrors.description='Vui lòng mô tả lỗi và các bước tái hiện.';
    else if(description.trim().length>4000)nextErrors.description='Mô tả tối đa 4.000 ký tự.';
    setFieldErrors(nextErrors);
    if(Object.keys(nextErrors).length){
      if(nextErrors.school){setSchoolOpen(true);schoolInputRef.current?.focus();}
      else document.getElementById(nextErrors.subject?'ticket-subject':'ticket-description')?.focus();
      return;
    }
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/customer-support-cases',{method:'POST',body:JSON.stringify({
        idempotency_key:crypto.randomUUID(),contract_id:Number(contractId),
        subject:subject.trim(),description:description.trim(),
      })});
      setCreating(false);setContractId('');setSubject('');setDescription('');setSchoolSearch('');
      setSelectedSchoolName('');setSchoolOpen(false);setFieldErrors({});setSchoolError('');setSchoolPage(1);
      await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:'Không tạo được ticket kỹ thuật.');}
    finally{setBusy(false);}
  };
  const update=async()=>{
    if(!selected||busy||!progress.trim()||progress.trim().length>4000||selected.status==='RESOLVED')return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/customer-support-cases/'+selected.id+'/progress',{
        method:'POST',body:JSON.stringify({status:nextStatus,content:progress.trim(),next_follow_up_at:null}),
      });
      setSelected(null);setProgress('');await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:'Không cập nhật được ticket.');}
    finally{setBusy(false);}
  };
  if(!allowed)return <p role="alert">Không có quyền xử lý yêu cầu CSKH.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Ticket lỗi hệ thống"
      description="Chỉ tạo ticket khi xác định lỗi phần mềm. Câu hỏi sử dụng thông thường được ghi nhật ký tại Trường phụ trách."
      actions={<AppButton leadingIcon={<Plus className="size-4"/>} disabled={!apiBase} onClick={()=>{setCreating(true);setError('');}}>Tạo ticket lỗi</AppButton>}/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc; kết nối Backend để tạo ticket.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);}}
        placeholder="Tên trường, nội dung lỗi..." searchLabel="Tìm ticket"
        filters={<select aria-label="Lọc trạng thái ticket" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}
          className="h-11 rounded-xl border bg-background px-3">
          <option value="ALL">Tất cả trạng thái</option><option value="OPEN">Mới nhận</option>
          <option value="IN_PROGRESS">Đang xử lý</option><option value="RESOLVED">Hoàn tất</option>
        </select>}/>
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th className={adminTableCellClass}>Trường</th><th className={adminTableCellClass}>Vấn đề</th>
          <th className={adminTableCellClass}>CHECKEE</th><th className={adminTableCellClass}>Trạng thái</th>
          <th className={adminTableCellClass}>Thao tác</th>
        </tr></thead>
        <tbody>{query.data?.data.map(t=><tr key={t.id} className="border-b even:bg-muted/20">
          <td className={adminTableCellClass}>{t.school_name}</td><td className={adminTableCellClass}>{t.subject}</td>
          <td className={adminTableCellClass}>{t.ticket_type==='SYSTEM_ERROR'
            ? t.checkee_responded_at?'Đã hoàn tất kỹ thuật':'Chờ phản hồi':'Ticket lịch sử'}</td>
          <td className={adminTableCellClass}><AdminStatusBadge status={t.status} label={t.status==='OPEN'?'Mới nhận':t.status==='IN_PROGRESS'?'Đang xử lý':'Hoàn tất'}/></td>
          <td className={adminTableCellClass}><AdminIconAction icon={Eye} label={'Xem ticket '+t.id}
            onClick={()=>{setSelected(t);setProgress('');setNextStatus('IN_PROGRESS');setError('');}}/></td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải ticket…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Chưa có ticket phù hợp.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={!apiBase||query.isFetching} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDialog open={creating} onOpenChange={open=>{if(!busy)setCreating(open);}} title="Gửi lỗi phần mềm cho CHECKEE"
      description="CSKH đã xác định đây là lỗi hệ thống, không phải thao tác sử dụng thông thường." busy={busy}
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setCreating(false)}>Hủy</AppButton>
        <AppButton busy={busy} disabled={busy} onClick={()=>void create()}>Tạo và gửi CHECKEE</AppButton></>}>
      <div className="space-y-3 text-sm">
        <label htmlFor="ticket-school-select" className="block font-medium">Chọn trường cần hỗ trợ *</label>
        <div className="relative">
          <div className="flex items-center rounded-xl border bg-background px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <input ref={schoolInputRef} id="ticket-school-select" role="combobox"
              aria-autocomplete="list" aria-expanded={schoolOpen} aria-controls="ticket-school-options"
              aria-invalid={!!fieldErrors.school} disabled={busy}
              className="min-w-0 flex-1 bg-transparent p-3 outline-none"
              placeholder="Tìm và chọn trường được phân công..." value={schoolSearch}
              onFocus={()=>setSchoolOpen(true)} onChange={e=>startSearch(e.target.value)}
              onKeyDown={e=>{
                if(e.key==='Escape'){setSchoolOpen(false);return;}
                if(e.key==='ArrowDown'){e.preventDefault();setSchoolOpen(true);setSchoolActiveIndex(i=>Math.min(i+1,schoolChoices.length-1));}
                if(e.key==='ArrowUp'){e.preventDefault();setSchoolActiveIndex(i=>Math.max(0,i-1));}
                if(e.key==='Enter'&&schoolOpen&&schoolActiveIndex>=0&&schoolChoices[schoolActiveIndex]){
                  e.preventDefault();selectSchool(schoolChoices[schoolActiveIndex]);
                }
              }}/>
            <button type="button" disabled={busy} aria-label="Mở danh sách trường được phân công"
              onClick={()=>setSchoolOpen(value=>!value)} className="p-2">
              <ChevronDown className="size-4" aria-hidden="true"/>
            </button>
          </div>
          {schoolOpen&&<div id="ticket-school-options"
            aria-label="Danh sách trường phụ trách" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-background p-1 shadow-lg">
            {(schools.isLoading||schools.isFetching)&&schoolChoices.length===0
              ?<p className="p-3 text-muted-foreground">Đang tải trường...</p>
              :schools.isError?<p role="alert" className="p-3 text-destructive">Không tải được danh sách trường.</p>
              :schoolChoices.length===0?<p className="p-3 text-muted-foreground">Không tìm thấy trường phù hợp.</p>
              :schoolChoices.map((school,index)=><button key={school.id} type="button"
                  aria-current={contractId===String(school.id)?"true":undefined} disabled={busy}
                  className={'flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted '+(schoolActiveIndex===index?'bg-muted':'')}
                  onMouseDown={e=>e.preventDefault()} onClick={()=>selectSchool(school)}>
                  <span>{school.school_name}</span>
                  {contractId===String(school.id)&&<Check className="size-4 text-emerald-600" aria-hidden="true"/>}
                </button>)}
            {schoolPage>1&&<button type="button" className="w-full rounded-lg p-2 text-center text-sm text-emerald-700 hover:bg-muted"
              disabled={schools.isFetching} onClick={()=>{setSchoolPage(n=>n-1);setSchoolActiveIndex(-1);}}>Trang trước</button>}
            {schoolPage*50<(schools.data?.total??0)&&<button type="button"
              className="w-full rounded-lg p-3 text-center text-sm text-emerald-700 hover:bg-muted"
              disabled={schools.isFetching} onClick={()=>{setSchoolPage(n=>n+1);setSchoolActiveIndex(-1);}}>
              Trang tiếp theo
            </button>}
          </div>}
        </div>
        {selectedSchoolName&&contractId&&<p className="text-xs text-emerald-700">Đã chọn: {selectedSchoolName}</p>}
        {(fieldErrors.school||schoolError)&&<p role="alert" className="text-xs text-destructive">{schoolError||fieldErrors.school}</p>}
        <label htmlFor="ticket-subject" className="block font-medium">Tiêu đề lỗi</label>
        <input id="ticket-subject" maxLength={190} value={subject} onChange={e=>{setSubject(e.target.value);setFieldErrors(x=>({...x,subject:undefined}));}}
          className="w-full rounded-xl border bg-background p-3"/>
        {fieldErrors.subject&&<p role="alert" className="text-xs text-destructive">{fieldErrors.subject}</p>}
        <label htmlFor="ticket-description" className="block font-medium">Mô tả lỗi và các bước tái hiện</label>
        <textarea id="ticket-description" rows={4} maxLength={4000} value={description}
          onChange={e=>{setDescription(e.target.value);setFieldErrors(x=>({...x,description:undefined}));}} className="w-full rounded-xl border bg-background p-3"/>
        {fieldErrors.description&&<p role="alert" className="text-xs text-destructive">{fieldErrors.description}</p>}
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>
    </AppDialog>
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}} busy={busy}
      title="Chi tiết ticket lỗi phần mềm" description={selected?.school_name}
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Đóng</AppButton>
        {selected?.status!=='RESOLVED'&&
          <AppButton busy={busy} disabled={busy||!progress.trim()||progress.trim().length>4000}
            onClick={()=>void update()}>Cập nhật ticket</AppButton>}</>}>
      {selected&&<div className="space-y-5 text-sm">
        <SupportTicketSummary subject={selected.subject} description={selected.description}
          statusLabel={selected.status==='RESOLVED'?'Hoàn tất'
            :selected.ticket_type==='SYSTEM_ERROR'
              ?selected.checkee_responded_at?'Chờ CSKH xác nhận':'Chờ CHECKEE xử lý'
              :selected.status==='OPEN'?'Mới nhận':'Đang xử lý'}/>
        {selected.ticket_type==='SYSTEM_ERROR'&&<section className="rounded-xl border bg-muted/20 p-3">
          <h3 className="font-semibold">Kết quả kỹ thuật CHECKEE</h3>
          <p className="mt-1 text-muted-foreground">
            {selected.checkee_responded_at?'CHECKEE đã hoàn tất kỹ thuật. Vui lòng xác nhận với nhà trường.'
              :'CHECKEE chưa hoàn tất kỹ thuật. CSKH vẫn có thể bổ sung tiến độ.'}
          </p>
        </section>}
        <SupportTicketTimeline entries={selected.activities}/>
        {selected.status!=='RESOLVED'&&<section className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">Xác nhận kết quả với nhà trường</h3>
          <fieldset className="space-y-2">
            <legend className="font-medium">Trạng thái cập nhật *</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="care-state" value="IN_PROGRESS" checked={nextStatus==='IN_PROGRESS'}
                disabled={busy} onChange={()=>setNextStatus('IN_PROGRESS')}/> Cần tiếp tục xử lý
            </label>
            {(selected.ticket_type!=='SYSTEM_ERROR'||selected.checkee_responded_at)&&
              <label className="flex items-center gap-2">
                <input type="radio" name="care-state" value="RESOLVED" checked={nextStatus==='RESOLVED'}
                  disabled={busy} onChange={()=>setNextStatus('RESOLVED')}/> Hoàn tất (đã xác nhận với trường)
              </label>}
          </fieldset>
          <label htmlFor="ticket-progress" className="block font-medium">
            Kết quả xác nhận với nhà trường *
          </label>
          <textarea id="ticket-progress" rows={4} maxLength={4000} value={progress}
            disabled={busy} aria-invalid={progress.length>4000}
            onChange={e=>{setProgress(e.target.value);setError('');}}
            placeholder="Nhập phản hồi của nhà trường và kết quả xác nhận..."
            className="w-full rounded-xl border bg-background p-3"/>
          <p className="text-xs text-muted-foreground">{progress.length}/4.000 ký tự</p>
        </section>}
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>}
    </AppDrawer>
  </div>;
}
