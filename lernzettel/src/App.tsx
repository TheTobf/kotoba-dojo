import { useEffect } from 'react'
import Hinweis from './components/Hinweis'
import FachSeite from './pages/FachSeite'
import Leser from './pages/Leser'
import Mehr from './pages/Mehr'
import Neu from './pages/Neu'
import Start from './pages/Start'
import Test from './pages/Test'
import Woche from './pages/Woche'
import { aktualisiere, useUpdateBereit } from './pwa'
import { pfad, useRoute } from './router'
import { useZustand } from './speicher'

const TABS = [
  { href: pfad.start(), seite: '', icon: '📚', text: 'Fächer' },
  { href: pfad.woche(), seite: 'woche', icon: '✅', text: 'Woche' },
  { href: pfad.neu(), seite: 'neu', icon: '➕', text: 'Einfügen' },
  { href: pfad.mehr(), seite: 'mehr', icon: '⋯', text: 'Mehr' },
]

function useDesign() {
  const { design } = useZustand()
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const anwenden = () => {
      const dunkel = design === 'dunkel' || (design === 'auto' && mq.matches)
      document.documentElement.classList.toggle('dark', dunkel)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dunkel ? '#111318' : '#f5f3ee')
    }
    anwenden()
    mq.addEventListener('change', anwenden)
    return () => mq.removeEventListener('change', anwenden)
  }, [design])
}

export default function App() {
  useDesign()
  const route = useRoute()
  const [seite = '', param] = route.teile
  const updateBereit = useUpdateBereit()
  const schluessel = route.teile.join('/') + '?' + route.query.toString()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [schluessel])

  let inhalt
  if (seite === 'fach' && param) inhalt = <FachSeite id={param} />
  else if (seite === 'zettel' && param) inhalt = <Leser id={param} />
  else if (seite === 'test' && param) inhalt = <Test art="zettel" id={param} />
  else if (seite === 'abschluss' && param) inhalt = <Test art="fach" id={param} />
  else if (seite === 'woche') inhalt = <Woche />
  else if (seite === 'neu') inhalt = <Neu bearbeiten={route.query.get('bearbeiten') ?? undefined} />
  else if (seite === 'mehr') inhalt = <Mehr />
  else inhalt = <Start />

  const mitLeiste = !['zettel', 'test', 'abschluss'].includes(seite)
  const aktiv = seite === 'fach' ? '' : seite

  return (
    <>
      {updateBereit && (
        <button
          type="button"
          onClick={() => void aktualisiere(true)}
          className="sicher-oben fixed inset-x-0 top-0 z-50 bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg"
        >
          ✨ Neue Lernzettel sind da – tippen zum Aktualisieren
        </button>
      )}
      <main key={schluessel}>{inhalt}</main>
      {mitLeiste && (
        <nav className="sicher-unten fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-papier/92 backdrop-blur-md dark:border-white/10 dark:bg-nacht/92">
          <div className="mx-auto grid max-w-2xl grid-cols-4">
            {TABS.map((t) => (
              <a
                key={t.text}
                href={t.href}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium transition ${
                  aktiv === t.seite ? 'text-tinte dark:text-white' : 'text-stone-400 dark:text-stone-500'
                }`}
                aria-current={aktiv === t.seite ? 'page' : undefined}
              >
                <span className={`text-xl transition ${aktiv === t.seite ? 'scale-110' : 'opacity-60 grayscale'}`}>{t.icon}</span>
                {t.text}
              </a>
            ))}
          </div>
        </nav>
      )}
      <Hinweis />
    </>
  )
}
