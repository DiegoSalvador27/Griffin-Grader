import type { ReactNode } from 'react';
import styles from './Placeholder.module.css';

/** Stand-in for a screen that a later build phase fills in. Kept deliberately
    plain so nobody mistakes it for finished work. */
export default function Placeholder({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <p className={`t-stencil ${styles.eyebrow}`}>{phase}</p>
      <h1 className="t-title">{title}</h1>
      <p className={styles.body}>{children}</p>
    </section>
  );
}
