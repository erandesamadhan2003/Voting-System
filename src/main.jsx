import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider as UIProvider } from './components/ui/provider'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './app/store'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <UIProvider>
        <App />
      </UIProvider>
    </ReduxProvider>
  </StrictMode>,
)
