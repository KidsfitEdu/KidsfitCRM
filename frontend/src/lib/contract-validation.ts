/** Shared client-side validation for initial reports and manager-requested corrections. */
export type ContractField =
  | 'signed_on' | 'service_plan' | 'student_count' | 'branch_count'
  | 'maintenance_fee' | 'setup_fee' | 'total_value' | 'contract_note' | 'contract_file';
export type ContractErrors = Partial<Record<ContractField, string>>;

export const contractFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const digits = /^\d+$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export type ContractValidationInput = {
  signedOn: string;
  registeredOn?: string | null;
  plan: string;
  students: string;
  branches: string;
  selectedUnitCount: number;
  maintenance: string;
  setup: string;
  note: string;
  file: File | null;
  existingEvidence: boolean;
};
export const localBusinessDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function validateContract(input: ContractValidationInput): ContractErrors {
  const errors: ContractErrors = {};
  const parsed = isoDate.test(input.signedOn) ? new Date(input.signedOn + 'T00:00:00Z') : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.signedOn ||
      input.signedOn > localBusinessDate() ||
      (input.registeredOn && input.signedOn < input.registeredOn.slice(0, 10)))
    errors.signed_on = 'Ngày ký hợp đồng không hợp lệ hoặc nằm ngoài thời gian được phép.';
  if (input.plan !== 'SCHOOL_YEAR' && input.plan !== 'MONTHLY_9')
    errors.service_plan = 'Vui lòng chọn hình thức thanh toán.';
  if (!digits.test(input.students) || !Number.isSafeInteger(Number(input.students)) ||
      Number(input.students) < 1 || Number(input.students) > 100000)
    errors.student_count = 'Quy mô học sinh phải là số nguyên từ 1 đến 100.000.';
  if (!digits.test(input.branches) || !Number.isSafeInteger(Number(input.branches)) ||
      Number(input.branches) < input.selectedUnitCount || Number(input.branches) > 100000)
    errors.branch_count = `Số phân hiệu phải từ ${input.selectedUnitCount} đến 100.000.`;
  if (!digits.test(input.maintenance) || !Number.isSafeInteger(Number(input.maintenance)))
    errors.maintenance_fee = 'Phí duy trì phải là số nguyên VNĐ không âm.';
  if (!digits.test(input.setup) || !Number.isSafeInteger(Number(input.setup)))
    errors.setup_fee = 'Phí khởi tạo phải là số nguyên VNĐ không âm.';
  if (!errors.maintenance_fee && !errors.setup_fee) {
    const total = Number(input.maintenance) * (input.plan === 'MONTHLY_9' ? 9 : 1) + Number(input.setup);
    if (!Number.isSafeInteger(total) || total <= 0)
      errors.total_value = 'Tổng giá trị hợp đồng phải là số nguyên lớn hơn 0.';
  }
  if (input.note.length > 4000) errors.contract_note = 'Ghi chú tối đa 4.000 ký tự.';
  if (input.file && input.file.size > 5 * 1024 * 1024)
    errors.contract_file = 'File hợp đồng tối đa 5 MB.';
  else if (input.file && !contractFileTypes.includes(input.file.type))
    errors.contract_file = 'Chỉ chấp nhận PDF, JPG, PNG hoặc WEBP.';
  else if ((!input.file || input.file.size === 0) && !input.existingEvidence)
    errors.contract_file = 'Vui lòng chọn file hợp đồng đã ký.';
  return errors;
}
