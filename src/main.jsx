import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initMockAPI } from './lib/mockAPI'

// Initialize mock API for browser testing (only when not in Electron)
initMockAPI()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

