import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallbackMessage="The application encountered an unexpected error. Please refresh the page.">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
