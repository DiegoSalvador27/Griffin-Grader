import styles from './Footer.module.css';

export const WATERMARK = 'Griffin Grader by Diego D.';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.mark}>{WATERMARK}</p>
    </footer>
  );
}
