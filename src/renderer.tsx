import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { startRendererLogging } from './lib/log'

const mode = new URLSearchParams(window.location.search).get('mode')
startRendererLogging(mode ? `pop-out ${mode}` : 'desk')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
