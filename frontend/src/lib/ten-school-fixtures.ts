/**
 * Public-facing subset of CRM_Import_Truong_Hoc.xlsx (the first ten main school codes).
 * Names, codes, wards and the first school's branch names match the source workbook.
 * PRIVATE contact names, addresses, telephones and emails are deliberately excluded.
 * Business stages are illustrative and never assert a real contract or verified payment.
 */
export type TrainingSchool = {
  code:string; name:string; ward:string; stage:'CONTRACTED'|'APPROACHING'|'AVAILABLE';
  contractStage:string|null; branches:readonly string[]; owner:string|null;
};
export const trainingSchools:readonly TrainingSchool[] = [
  {code:'SCH0001',name:'Trường Mầm Non Ninh Kiều',ward:'Phường Ninh Kiều',stage:'CONTRACTED',contractStage:'ACTIVE',owner:'Nhân viên kinh doanh',branches:[
    'Phân hiệu 2 Tháng 9','Phân hiệu An Nghiệp','Phân hiệu Phượng Hồng',
    'Phân hiệu Sơn Ca','Phân hiệu Hoàng Yến','Phân hiệu 8 tháng 3',
    'Phân hiệu An Phú','Phân hiệu Bông Sen','Phân hiệu Hoàng Anh']},
  {code:'SCH0002',name:'Trường Mẫu Giáo Hoa Mai',ward:'Phường Ninh Kiều',stage:'CONTRACTED',contractStage:'ACTIVE',owner:'CTV Thu Hà',branches:[]},
  {code:'SCH0003',name:'Trường Mầm Non Hướng Dương',ward:'Phường Ninh Kiều',stage:'APPROACHING',contractStage:'PENDING_KIDSFIT',owner:'Nhân viên kinh doanh',branches:[]},
  {code:'SCH0004',name:'Trường Mầm Non Thanh Xuân',ward:'Phường Ninh Kiều',stage:'APPROACHING',contractStage:'MANAGER_REVIEWED',owner:'CTV Thu Hà',branches:[]},
  {code:'SCH0005',name:'Trường Mầm Non Việt Mỹ',ward:'Phường Ninh Kiều',stage:'APPROACHING',contractStage:'NEEDS_REVISION',owner:'Nhân viên kinh doanh',branches:[]},
  {code:'SCH0006',name:'Trường Mầm Non Mai Anh',ward:'Phường Ninh Kiều',stage:'APPROACHING',contractStage:'PENDING_REVIEW',owner:'Nhân viên kinh doanh',branches:[]},
  {code:'SCH0007',name:'Trường Mầm Non Ngôi Sao',ward:'Phường Ninh Kiều',stage:'APPROACHING',contractStage:null,owner:'Nhân viên kinh doanh',branches:[]},
  {code:'SCH0008',name:'Trường Mầm Non Cái Khế',ward:'Phường Cái Khế',stage:'APPROACHING',contractStage:null,owner:'CTV Thu Hà',branches:[]},
  {code:'SCH0009',name:'Trường Mầm Non Trạng Tí 2',ward:'Phường Cái Khế',stage:'AVAILABLE',contractStage:null,owner:null,branches:[]},
  {code:'SCH0010',name:'Trường Mầm Non Mặt Trời Nhỏ 2',ward:'Phường Cái Khế',stage:'AVAILABLE',contractStage:null,owner:null,branches:[]},
] as const;
