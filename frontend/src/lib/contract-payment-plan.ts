/** KC-01 fee plans determine the billing cycle, not the installment schedule. */
export type ContractServicePlan = 'SCHOOL_YEAR' | 'MONTHLY_9';
export type ContractPaymentCycle = 'YEARLY' | 'MONTHLY';

export const paymentCycleForPlan = (plan: ContractServicePlan): ContractPaymentCycle =>
  plan === 'MONTHLY_9' ? 'MONTHLY' : 'YEARLY';
