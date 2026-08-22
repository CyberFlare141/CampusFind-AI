import type { ReactNode } from 'react';

export function Notice({ type = 'error', children }: { type?: 'error' | 'success'; children: ReactNode }) {
  return <div className={`notice notice-${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>;
}
