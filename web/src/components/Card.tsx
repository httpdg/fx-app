import { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return <div className="card">{children}</div>;
}
