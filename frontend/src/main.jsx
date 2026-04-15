import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('wp-barq-root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
