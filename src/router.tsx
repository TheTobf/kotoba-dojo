/**
 * Alle Seiten der App an einer Stelle.
 *   /            öffentliche Seiten (SiteLayout)
 *   /app/…       App-Bereich (AppLayout): Start, Lernen, Story, Sprechen, Profil
 * Der App-Bereich wird erst geladen, wenn man ihn öffnet – die Landingpage bleibt dadurch schnell.
 */
import { createBrowserRouter } from 'react-router-dom'
import SiteLayout from './layouts/SiteLayout'
import ErrorPage from './pages/ErrorPage'
import Landing from './pages/site/Landing'

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/preise', lazy: () => import('./pages/site/Pricing') },
      { path: '/anmelden', lazy: () => import('./pages/site/Login') },
      { path: '/kuendigen', lazy: () => import('./pages/site/Cancel') },
      { path: '/warteliste/bestaetigen', lazy: () => import('./pages/site/WaitlistConfirm') },
      { path: '/impressum', lazy: () => import('./pages/site/legal/Impressum') },
      { path: '/datenschutz', lazy: () => import('./pages/site/legal/Datenschutz') },
      { path: '/agb', lazy: () => import('./pages/site/legal/Agb') },
      { path: '/widerruf', lazy: () => import('./pages/site/legal/Widerruf') },
      { path: '/quellen', lazy: () => import('./pages/site/legal/Quellen') },
      { path: '*', lazy: () => import('./pages/NotFound') },
    ],
  },
  {
    path: '/app',
    lazy: async () => ({ Component: (await import('./layouts/AppLayout')).default }),
    errorElement: <ErrorPage />,
    children: [
      { index: true, lazy: () => import('./pages/app/Home') },
      { path: 'lernen', lazy: () => import('./pages/app/Learn') },
      { path: 'lernen/sitzung', lazy: () => import('./pages/app/Review') },
      { path: 'lernen/schrift', lazy: () => import('./pages/app/Writing') },
      { path: 'lernen/quiz', lazy: () => import('./pages/app/Quiz') },
      { path: 'lernen/satzbau', lazy: () => import('./pages/app/Grammar') },
      { path: 'story', lazy: () => import('./pages/app/Story') },
      { path: 'story/folge/:episodeId', lazy: () => import('./pages/app/Episode') },
      { path: 'story/mission/:missionId', lazy: () => import('./pages/app/StoryMission') },
      { path: 'sprechen', lazy: () => import('./pages/app/Speak') },
      { path: 'sprechen/probe/:missionId', lazy: () => import('./pages/app/TrialMission') },
      { path: 'sprechen/figur/:characterId', lazy: () => import('./pages/app/Chat') },
      { path: 'profil', lazy: () => import('./pages/app/Profile') },
      { path: 'upgrade', lazy: () => import('./pages/app/Upgrade') },
      { path: '*', lazy: () => import('./pages/NotFound') },
    ],
  },
])
