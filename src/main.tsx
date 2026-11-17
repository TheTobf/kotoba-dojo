import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AccountProvider } from './lib/account'
import { watchTheme } from './lib/theme'
import { router } from './router'
import './styles/index.css'

watchTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountProvider>
      <RouterProvider router={router} />
    </AccountProvider>
  </StrictMode>,
)
