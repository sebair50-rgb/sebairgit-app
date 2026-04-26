import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register service worker with update prompt
registerSW({
  onNeedRefresh() {
    // App will auto-update on next load
  },
  onOfflineReady() {
    console.log('[SebairGit] App ready to work offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
