'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContractRenewalAccountingPanel } from '../Contracts/ContractRenewalAccountingPanel';

import type { RolePageProps } from '@/types/role-pages';
import { AccountingContractsPage } from '../Contracts/AccountingContractsPage';

/** Accounting contracts, receipts and commission overview; financial writes remain permission gated. */
export function RevenuePage({ apiBase, token, onChanged, abilities }: RolePageProps) {
  return <AccountingContractsPage apiBase={apiBase} token={token} onChanged={onChanged} abilities={abilities}/>;
}
