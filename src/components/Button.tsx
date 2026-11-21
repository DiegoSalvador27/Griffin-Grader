import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'gold' | 'ghost' | 'quiet' | 'danger' | 'onNavy';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'default' | 'lg';
  wide?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'ghost',
  size = 'default',
  wide = false,
  className,
  type = 'button',
  children,
  ...rest
}: Props) {
  const classes = [
    styles.btn,
    styles[variant],
    size === 'lg' ? styles.lg : '',
    wide ? styles.wide : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
