import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import styles from './Field.module.css';

function Label({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <label className={styles.label} htmlFor={htmlFor}>
      {label}
      {hint ? <span className={styles.hint}> {hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <Label htmlFor={id} label={label} hint={hint} />
      <input id={id} className={styles.input} type="text" {...rest} />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  ...rest
}: { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <Label htmlFor={id} label={label} hint={hint} />
      <textarea id={id} className={styles.textarea} {...rest} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...rest
}: { label: string; hint?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <Label htmlFor={id} label={label} hint={hint} />
      <select id={id} className={styles.select} {...rest}>
        {children}
      </select>
    </div>
  );
}
