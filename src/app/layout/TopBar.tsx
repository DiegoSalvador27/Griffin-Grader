import { NavLink } from 'react-router-dom';
import { assetUrl } from '../../lib/assets';
import styles from './TopBar.module.css';

const NAV = [
  { to: '/classes', label: 'Classes' },
  { to: '/rubrics', label: 'Rubrics' },
  { to: '/export', label: 'Export' },
  { to: '/settings', label: 'Settings' },
] as const;

export default function TopBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.id}>
        <img
          className={styles.crest}
          src={assetUrl('crest.png')}
          alt=""
          width={134}
          height={140}
        />
        <div>
          <p className={styles.name}>Griffin Grader</p>
          <p className={`t-stencil ${styles.school}`}>Ernest Manning High School</p>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={styles.link}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
