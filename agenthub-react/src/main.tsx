import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Only use StrictMode in production
const isProd = import.meta.env.PROD;

createRoot(document.getElementById('root')!).render(
  isProd ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  ),
)
