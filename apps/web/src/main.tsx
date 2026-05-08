import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Dark mode: apply class based on system preference
const applyTheme = () => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)
}
applyTheme()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
