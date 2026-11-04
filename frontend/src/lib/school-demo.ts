import { trainingSchools } from './ten-school-fixtures.ts';

/** Static preview is intentionally read-only. Connected mode uses authenticated API/MySQL. */
export async function readSchoolDemo<T>(path:string):Promise<T>{
  const now=new Date();
  const verifiedAt=new Date(now.getTime()-10*86400000);
  const protectionUntil=new Date(verifiedAt);
  protectionUntil.setUTCFullYear(protectionUntil.getUTCFullYear()+5);
  const schools=trainingSchools.map((s,i)=>({
    id:i+1, customer_id:i+1001, school_code:s.code, display_name:s.name,
    province:'Cần Thơ',ward:s.ward,branches:s.branches.length,
    visible_status:s.stage,
    protected_from:s.contractStage==='ACTIVE'?verifiedAt.toISOString()
      :!s.contractStage&&s.stage==='APPROACHING'?new Date(now.getTime()-2*86400000).toISOString():null,
    protected_until:s.contractStage==='ACTIVE'?protectionUntil.toISOString()
      :!s.contractStage&&s.stage==='APPROACHING'?new Date(now.getTime()+3*86400000).toISOString():null,
    can_register:false,contract_id:s.contractStage?3001+i:null,contract_status:s.contractStage,
  }));
  const url=new URL(path,'https://preview.invalid');
  if(url.pathname==='/school-capacities')return {data:[
    {id:1,name:'Nhân viên kinh doanh',organization_name:'KIDSFIT',school_approach_limit:10,active:1,history:[]},
    {id:2,name:'CTV Thu Hà',organization_name:'Đối tác An Phát',school_approach_limit:10,active:1,history:[]}
  ]} as T;
  if(url.pathname==='/schools'){
    const norm=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
    const term=norm(url.searchParams.get('search')??'');
    const filtered=schools.filter(s=>norm([s.display_name,s.school_code,s.ward,s.province].join(' ')).includes(term));
    const page=Math.max(1,Number(url.searchParams.get('page'))||1);
    const size=20;
    return {data:filtered.slice((page-1)*size,page*size),total:filtered.length,page,page_size:size} as T;
  }
  const match=url.pathname.match(/^\/schools\/(\d+)$/);
  const school=match?schools.find(s=>s.id===Number(match[1])):undefined;
  if(!school)throw new Error('Chức năng này cần kết nối Backend.');
  const src=trainingSchools[school.id-1];
  return {
    id:school.id,school_code:school.school_code,customer_id:school.customer_id,
    display_name:school.display_name,registration_id:null,
    protected_until:school.protected_until,can_report_contract:false,can_activity:false,
    packages:[],
    units:[src.name,...src.branches].map((name,i)=>({
      id:school.id*100+i,unit_type:i===0?'MAIN':'BRANCH',name,
      province:school.province,ward:school.ward,address:null,contact_name:null,
      contact_position:null,contact_phone:null,school_phone:null,email:null,note:null,
    })),
    contracts:src.contractStage?[{
      id:school.contract_id,contract_code:'CHK-2026-'+school.school_code.slice(3),
      status:src.contractStage,verified_at:src.contractStage==='ACTIVE'||src.contractStage==='PENDING_KIDSFIT'?verifiedAt.toISOString():null,
      protection_until:src.contractStage==='ACTIVE'?protectionUntil.toISOString():null,
      can_review:false,can_grant:false,
    }]:[],
    activities:school.visible_status==='APPROACHING'&&!src.contractStage?[{
      activity_type:'CALL',content:'Đã liên hệ và thống nhất lịch trình diễn hệ thống.',
      created_at:now.toISOString(),next_follow_up_at:new Date(now.getTime()+86400000).toISOString(),
    }]:[],
  } as T;
}
