import type { ReactNode } from 'react';
import styles from './Banner.module.css';

export default function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'danger';
  children: ReactNode;
}) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role="status">
      {children}
    </div>
  );
}
