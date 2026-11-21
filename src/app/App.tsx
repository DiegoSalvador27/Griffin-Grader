import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Placeholder from '../components/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/classes" replace />} />

        <Route
          path="/classes"
          element={
            <Placeholder title="Classes" phase="Phase 2">
              Your classes will live here: start a class, add students, import a
              roster.
            </Placeholder>
          }
        />
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
    </Routes>
  );
}
