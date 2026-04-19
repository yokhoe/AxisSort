/**
 * File: main.tsx
 * Purpose: Frontend entry point. Mounts the React application.
 * Main exports: None
 * Dependencies: React, ReactDOM, App
 * Notes: Standard Vite + React entry point.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
