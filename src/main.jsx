import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

function readInitialTheme() {
  try {
    const stored = localStorage.getItem('eduvault-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* shortcut: no storage in some embeds, default dark */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

document.documentElement.setAttribute('data-theme', readInitialTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
