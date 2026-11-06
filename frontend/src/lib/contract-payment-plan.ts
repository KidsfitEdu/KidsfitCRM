/** KC-01 fee plans determine the billing cycle, not the installment schedule. */
export type ContractServicePlan = 'SCHOOL_YEAR' | 'MONTHLY_9';
export type ContractPaymentCycle = 'YEARLY' | 'MONTHLY';

export const paymentCycleForPlan = (plan: ContractServicePlan): ContractPaymentCycle =>
  plan === 'MONTHLY_9' ? 'MONTHLY' : 'YEARLY';

/** Human-readable service plan labels, shared across all CRM roles. */
export const getServicePlanLabel = (servicePlan: string | null | undefined): string => {
  switch (servicePlan) {
    case 'SCHOOL_YEAR':
      return 'Gói năm học (9 tháng, tặng 3 tháng hè)';
    case 'MONTHLY_9':
      return 'Gói hàng tháng (9 tháng)';
    default:
      return 'Chưa xác định';
  }
};
