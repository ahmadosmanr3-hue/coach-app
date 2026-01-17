import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// DEBUG: Global Error Handler for Production Blank Screen
window.onerror = function (message, source, lineno, colno, error) {
  console.error("Global Error Caught:", message);
  const root = document.getElementById('root');
  if (root && root.innerHTML === "") { // Only override if blank
    root.innerHTML = `
      <div style="color: #ff6b6b; padding: 20px; font-family: monospace; background: #1a1a1a; height: 100vh; overflow: auto;">
          <h1 style="font-size: 24px; margin-bottom: 20px;">Startup Error</h1>
          <p style="font-weight: bold;">${message}</p>
          <p>${source}:${lineno}:${colno}</p>
          <pre style="background: #333; padding: 10px; border-radius: 4px; overflow: auto;">${error?.stack || 'No stack trace'}</pre>
      </div>
      `;
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
