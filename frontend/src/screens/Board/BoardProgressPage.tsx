'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppPagination } from '@/components/common/app-pagination';
import { AppSelect } from '@/components/common/app-select';
import {
  AdminListPanel, AdminListToolbar, adminTableClass, adminTableHeadClass
} from '@/components/common/admin-list-ui';
import { SchoolWorkLogDrawer } from '@/components/crm/schools/school-work-log-drawer';
import {
  ProgressTableHeading, ProgressTableRows, type ProgressSchool
} from '@/components/crm/schools/school-progress-table';
import { Button } from '@/components/ui/button';
import { channelRequest, channelQueryKeys } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type ProgressResult={
  data:ProgressSchool[];total:number;page:number;page_size:number;
  staff:{id:number;name:string}[];
  organizations:{id:number;name:string}[];
};

export function BoardProgressPage({apiBase,token,abilities}:RolePageProps) {
  const preview=!apiBase;
  const allowed=abilities.includes('*')||
    (abilities.includes('channel_sales.all_scope')&&abilities.includes('channel_sales.customer.view'));
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [orgFilter,setOrgFilter]=useState('ALL');
  const [staffFilter,setStaffFilter]=useState('ALL');
  const [status,setStatus]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [journal,setJournal]=useState<ProgressSchool|null>(null);

  const progress=useQuery({
    queryKey:[...channelQueryKeys.all,'board-progress',apiBase,search,orgFilter,staffFilter,status,page,pageSize],
    queryFn:()=>{
      const params=new URLSearchParams({page:String(page),page_size:String(pageSize),status});
      if(search.trim())params.set('search',search.trim());
      if(orgFilter!=='ALL')params.set('organization_id',orgFilter);
      if(staffFilter!=='ALL')params.set('owner_user_id',staffFilter);
      return channelRequest<ProgressResult>(apiBase,token,'/board/progress-schools?'+params);
    },
    enabled:!preview&&allowed&&!!token,
    placeholderData:previous=>previous,
  });
  const reset=()=>{
    setDraft('');setSearch('');setOrgFilter('ALL');setStaffFilter('ALL');
    setStatus('ALL');setPage(1);
  };

  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / THEO DÕI TIẾN ĐỘ"
      title="Theo dõi tiến độ tiếp cận"
      description="Giám sát các trường và Sales/CTV đang phụ trách trên toàn hệ thống."/>
    {preview&&<p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      Nhật ký và tiến độ toàn hệ thống chỉ hiển thị khi đăng nhập vào CRM có kết nối Backend.
    </p>}
    {!preview&&!allowed&&<p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
      Tài khoản không có quyền giám sát tiến độ toàn hệ thống.
    </p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}} onReset={reset}
        searchLabel="Tìm trường hoặc Sales/CTV"
        placeholder="Tên trường, mã trường, tên nhân viên phụ trách..."
        filters={<div className="flex flex-wrap gap-2">
          <AppSelect ariaLabel="Lọc tổ chức hoặc đối tác" className="w-[185px]"
            value={orgFilter} disabled={!allowed||preview}
            options={[{value:'ALL',label:'Tất cả tổ chức'},
              ...(progress.data?.organizations??[]).map(o=>({value:String(o.id),label:o.name}))]}
            onValueChange={next=>{setOrgFilter(next);setStaffFilter('ALL');setPage(1);}}/>
          <AppSelect ariaLabel="Lọc nhân viên Sales/CTV" className="w-[185px]"
            value={staffFilter} disabled={!allowed||preview}
            options={[{value:'ALL',label:'Tất cả Sales/CTV'},
              ...(progress.data?.staff??[]).map(s=>({value:String(s.id),label:s.name}))]}
            onValueChange={next=>{setStaffFilter(next);setPage(1);}}/>
          <AppSelect ariaLabel="Lọc trạng thái" className="w-[180px]"
            value={status} disabled={!allowed||preview}
            options={[{value:'ALL',label:'Tất cả trạng thái'},
              {value:'APPROACHING',label:'Đang tiếp cận'},
              {value:'CONTRACTED',label:'Đã ký hợp đồng'}]}
            onValueChange={next=>{setStatus(next);setPage(1);}}/>
        </div>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><ProgressTableHeading board/></thead>
          <tbody><ProgressTableRows board rows={progress.data?.data??[]}
            onJournal={row=>{if(!preview&&allowed)setJournal(row);}}/></tbody>
        </table>
        {progress.isPending&&!preview&&allowed&&
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Đang tải tiến độ...</p>}
        {progress.error&&<div role="alert" className="space-y-3 px-5 py-8 text-center">
          <p className="text-sm text-destructive">Không thể tải tiến độ theo phạm vi được cấp.</p>
          <Button type="button" variant="outline" onClick={()=>void progress.refetch()}>Thử lại</Button>
        </div>}
        {progress.data?.data.length===0&&!progress.isFetching&&
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Không có trường phù hợp với bộ lọc.</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={progress.data?.total??0}
        disabled={progress.isFetching||preview||!allowed} showSummary={false}
        pageSizeOptions={[10,20,50]}
        onPageSizeChange={next=>{setPageSize(next);setPage(1);}}
        onPageChange={setPage}/>
    </AdminListPanel>
    <SchoolWorkLogDrawer key={journal?.id??'closed'} open={journal!==null}
      onOpenChange={next=>{if(!next)setJournal(null);}}
      customerId={journal?.id??null} schoolName={journal?.display_name??''}
      apiBase={apiBase} token={token}/>
  </div>;
}
