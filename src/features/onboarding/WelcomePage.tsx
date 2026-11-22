import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { assetUrl } from '../../lib/assets';
import { WatermarkButton } from '../../app/layout/Footer';
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

  const tryDemo = async (): Promise<void> => {
    setBusy(true);
    try {
      const id = await createDemoClass();
      await updateSettings({ onboardingDone: true });
      navigate(`/classes/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <img
            className={styles.crest}
            src={assetUrl('crest.png')}
            alt=""
            width={134}
            height={140}
          />

          <div>
            <h1 className={styles.wordmark}>Griffin Grader</h1>
            <p className={`t-stencil ${styles.school}`}>Ernest Manning High School</p>
          </div>

          <p className={styles.lede}>
            Take attendance and grade your PE classes from your iPad. Everything stays
            on this iPad.
          </p>

          <ul className={styles.does}>
            <li>Tap a student, tap a level, it is saved</li>
            <li>Split the class into even teams in a second</li>
            <li>Export the day as a sheet for PowerSchool</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <h2 className={styles.actionsHead}>Get started</h2>

          <div className={styles.buttons}>
            <Button
              variant="gold"
              size="lg"
              wide
              disabled={busy}
              onClick={() => void finish('/classes/new')}
            >
              Create my first class
            </Button>
            <Button size="lg" wide disabled={busy} onClick={() => void tryDemo()}>
              {busy ? 'Setting up' : 'Try a demo class'}
            </Button>
          </div>

          {/* Only shown in a Safari tab, which is exactly where the data is at
              risk. A teacher who already installed does not need telling. */}
          {!installed ? (
            <div className={styles.install}>
              <h3 className={`t-stencil ${styles.installTitle}`}>
                Add this to your Home Screen first
              </h3>
              <p>
                iPadOS can clear what a Safari tab stores if a site goes unused.
                Opening Griffin Grader from the Home Screen keeps your classes.
              </p>
              <ol className={styles.steps}>
                <li>Tap the Share button in Safari.</li>
                <li>Tap Add to Home Screen.</li>
                <li>Open it from the Home Screen from now on.</li>
              </ol>
            </div>
          ) : null}
        </div>

        <WatermarkButton className={styles.watermark} />
      </div>
    </div>
  );
}
