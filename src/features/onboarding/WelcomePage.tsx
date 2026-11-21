import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { WATERMARK } from '../../app/layout/Footer';
import { isInstalled, updateSettings } from '../../db/repos/settings';
import { createDemoClass } from './demo';

import styles from './WelcomePage.module.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [installed] = useState(isInstalled);
  const [busy, setBusy] = useState(false);

  const finish = async (go: string): Promise<void> => {
    await updateSettings({ onboardingDone: true });
    navigate(go);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <div className={styles.hero}>
          <img
            className={styles.crest}
            src={`${import.meta.env.BASE_URL}crest.png`}
            alt=""
            width={134}
            height={140}
          />
          <div>
            <h1 className="t-title">Griffin Grader</h1>
            <p className={`t-stencil ${styles.school}`}>Ernest Manning High School</p>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.lede}>
            Grade your PE classes right from your iPad. Everything stays on this iPad.
          </p>

          {/* The install card only appears in a Safari tab, which is exactly
              where the data is at risk (SPEC 4.1). */}
          {!installed ? (
            <div className={styles.install}>
              <h2>Add this to your Home Screen first</h2>
              <p>
                iPadOS can clear what a Safari tab stores if the site goes unused for a
                while. Opening Griffin Grader from the Home Screen keeps your classes.
              </p>
              <ol className={styles.steps}>
                <li>Tap the Share button in Safari.</li>
                <li>Tap Add to Home Screen.</li>
                <li>Open Griffin Grader from the Home Screen from now on.</li>
              </ol>
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button
              variant="gold"
              size="lg"
              disabled={busy}
              onClick={() => void finish('/classes/new')}
            >
              Create my first class
            </Button>
            <Button
              size="lg"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const id = await createDemoClass();
                  await updateSettings({ onboardingDone: true });
                  navigate(`/classes/${id}`);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Try a demo class
            </Button>
          </div>
        </div>

        <p className={styles.watermark}>{WATERMARK}</p>
      </div>
    </div>
  );
}
