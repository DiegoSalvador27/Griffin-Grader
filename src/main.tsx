import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app/App';
import { registerServiceWorker } from './app/pwa';
import './styles/global.css';

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
