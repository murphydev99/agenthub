import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Check if embedded
const params = new URLSearchParams(window.location.search);
if (params.get('embedded') === 'true') {
  document.body.classList.add('embedded');
  document.getElementById('root')?.classList.add('embedded');
}

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
