import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Placeholder from '../components/Placeholder';
import { useBoot } from './useBoot';
import ClassesPage from '../features/classes/ClassesPage';
import NewClassWizard from '../features/classes/NewClassWizard';
import ClassPage from '../features/classes/ClassPage';
import StudentPage from '../features/classes/StudentPage';
import LiveClassPage from '../features/live/LiveClassPage';
import { ToastProvider } from '../components/Toast';

export default function App() {
  const ready = useBoot();

  // Rendering before the seed lands would flash an empty rubric picker.
  if (!ready) return null;

  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/classes" replace />} />

          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/new" element={<NewClassWizard />} />
          <Route path="/classes/:classId" element={<ClassPage />} />
          <Route path="/classes/:classId/students/:studentId" element={<StudentPage />} />

          <Route
            path="/rubrics"
            element={
              <Placeholder title="Rubrics" phase="Phase 5">
                Edit categories, levels and quick comments.
              </Placeholder>
            }
          />
          <Route
            path="/export"
            element={
              <Placeholder title="Export" phase="Phase 4">
                Preview the PowerSchool sheet and download the day's results.
              </Placeholder>
            }
          />
          <Route
            path="/settings"
            element={
              <Placeholder title="Settings" phase="Phase 7">
                Backups, storage status and the teacher name.
              </Placeholder>
            }
          />

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
