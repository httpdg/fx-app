import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

export function Button({ variant = 'primary', className, ...rest }: Props) {
  const cls = `btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${className ?? ''}`.trim();
  return <button className={cls} {...rest} />;
}
