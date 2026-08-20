import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import electronAPI from './api'

// 云端版本：用 HTTP 实现的 electronAPI 注入全局，页面代码无需改动
window.electronAPI = electronAPI

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)