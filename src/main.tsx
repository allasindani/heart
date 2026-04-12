import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error("Critical rendering error:", error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Application Error</h2>
      <p>The application failed to start. Please try refreshing.</p>
      <pre style="background: #eee; padding: 10px; border-radius: 5px;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>`;
  }
}
