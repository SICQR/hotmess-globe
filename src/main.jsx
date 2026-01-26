import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAnalytics } from '@/components/utils/analytics'

// Initialize analytics and error tracking
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
