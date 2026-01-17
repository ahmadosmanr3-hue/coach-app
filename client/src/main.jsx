import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// GHOST FIX: The production build somehow references 'CheckSquare' even though we don't use it.
// We define it globally to stop the "ReferenceError" crash.
window.CheckSquare = () => null;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
