import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import KeycloakProvider from './auth/KeycloakProvider'
import App from './App.jsx'
import './index.css'

// Dev'de konsoldan store'a erismek icin
if (import.meta.env.DEV) {
  window.__store = store;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <KeycloakProvider>
        <App />
      </KeycloakProvider>
    </Provider>
  </React.StrictMode>,
)