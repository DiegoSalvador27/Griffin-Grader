import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app/App';
import { registerServiceWorker } from './app/pwa';
import { blockZoomGestures } from './lib/noZoom';
import { startErrorLog } from './lib/errorLog';
import './styles/global.css';

// Installed before render, so an error thrown during the first paint is
// still captured for the debug panel.
startErrorLog();
blockZoomGestures();

const container = document.getElementById('root');
if (!container) throw new Error('Griffin Grader: #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    {/* HashRouter, not BrowserRouter: GitHub Pages has no SPA fallback, so a
        reload on /classes would 404. Hash routes never hit the server. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

registerServiceWorker();
