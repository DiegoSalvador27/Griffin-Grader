import { tierOf } from '../lib/tiers';
import styles from './LevelChip.module.css';

export default function LevelChip({ code }: { code: string }) {
  return <span className={`${styles.chip} ${styles[tierOf(code)]}`}>{code}</span>;
}
