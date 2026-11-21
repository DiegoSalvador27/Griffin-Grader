import { Navigate, Route, Routes } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import AppLayout from './layout/AppLayout';
import Placeholder from '../components/Placeholder';
import { useBoot } from './useBoot';
import { getSettings } from '../db/repos/settings';
import ClassesPage from '../features/classes/ClassesPage';
import NewClassWizard from '../features/classes/NewClassWizard';
import ClassPage from '../features/classes/ClassPage';
import StudentPage from '../features/classes/StudentPage';
import LiveClassPage from '../features/live/LiveClassPage';
import ExportPage from '../features/export/ExportPage';
import RubricsPage from '../features/rubrics/RubricsPage';
import SettingsPage from '../features/settings/SettingsPage';
import WelcomePage from '../features/onboarding/WelcomePage';
import { ToastProvider } from '../components/Toast';

export default function App() {
  const ready = useBoot();
  const settings = useLiveQuery(() => getSettings(), []);

  // Rendering before the seed lands would flash an empty rubric picker.
  if (!ready || !settings) return null;

  return (
    <ToastProvider>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />

        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Navigate to={settings.onboardingDone ? '/classes' : '/welcome'} replace />
            }
          />

          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/new" element={<NewClassWizard />} />
          <Route path="/classes/:classId" element={<ClassPage />} />
          <Route path="/classes/:classId/students/:studentId" element={<StudentPage />} />

          <Route path="/rubrics" element={<RubricsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route
            path="*"
            element={
              <Placeholder title="Page not found" phase="Griffin Grader">
                That link does not go anywhere. Use the menu above.
              </Placeholder>
            }
          />
        </Route>

        {/* Outside AppLayout on purpose: the live screen owns the whole
            viewport and brings its own scoreboard and bottom toolbar. */}
        <Route path="/live/:classId" element={<LiveClassPage />} />
      </Routes>
    </ToastProvider>
  );
}
