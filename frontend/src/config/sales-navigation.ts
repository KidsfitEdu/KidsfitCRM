import type { View } from './navigation';

// Canonical six-entry Sales menu for both employees and collaborators.
// Legacy view IDs remain routable through navigation.ts and routes.ts.
export const salesMenuIds: readonly View[] = [
  'role-sales-staff-dashboard',
  'role-sales-staff-schools',
  'role-sales-staff-customers',
  'role-sales-staff-activities',
  'role-sales-staff-proposals',
  'role-sales-staff-income',
];

const legacySalesViews: Partial<Record<View, View>> = {
  'role-collaborator-dashboard': 'role-sales-staff-dashboard',
  'role-collaborator-schools': 'role-sales-staff-schools',
  'role-collaborator-proposals': 'role-sales-staff-proposals',
  'role-collaborator-invitations': 'role-sales-staff-customers',
  'role-collaborator-approaches': 'role-sales-staff-activities',
  'role-collaborator-extensions': 'role-sales-staff-activities',
  'role-collaborator-income': 'role-sales-staff-income',
};

export function canonicalSalesView(view: View): View {
  return legacySalesViews[view] ?? view;
}

export function legacySalesWorkflowTab(view: View): 'invitations' | 'extensions' | undefined {
  if (view === 'role-collaborator-invitations') return 'invitations';
  if (view === 'role-collaborator-extensions') return 'extensions';
  return undefined;
}
