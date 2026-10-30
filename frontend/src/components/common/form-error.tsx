import type { ReactNode } from 'react';

export function FormError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return <p id={id} role="alert" className="text-sm text-destructive">{children}</p>;
}
