import { useEffect, useMemo, useRef, type MouseEvent } from 'react'

interface Props {
  html: string
  /** abgehakte Checklisten-Punkte */
  haken?: number[]
  onHaken?: (nr: number, an: boolean) => void
}

/** Zeigt gerendertes Markdown an und macht Checklisten und interne Sprungmarken bedienbar. */
export default function Markdown({ html, haken = [], onHaken }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inhalt = useMemo(() => ({ __html: html }), [html])
  const hakenKey = haken.join(',')

  useEffect(() => {
    const an = new Set(hakenKey ? hakenKey.split(',').map(Number) : [])
    ref.current?.querySelectorAll<HTMLInputElement>('input.haken').forEach((el) => {
      el.checked = an.has(Number(el.dataset.haken))
      el.disabled = !onHaken
    })
  }, [html, hakenKey, onHaken])

  function klick(e: MouseEvent<HTMLDivElement>) {
    const ziel = e.target as HTMLElement
    const link = ziel.closest('a')
    if (link) {
      const href = link.getAttribute('href') ?? ''
      // „#abschnitt“-Links nicht als Seitenwechsel behandeln (Hash-Routing)
      if (href.startsWith('#') && !href.startsWith('#/')) {
        e.preventDefault()
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }
    if (!onHaken) return
    let box: HTMLInputElement | null = null
    if (ziel instanceof HTMLInputElement && ziel.classList.contains('haken')) box = ziel
    else {
      const punkt = ziel.closest('li.haken-punkt')
      if (!punkt || ziel.closest('details, summary, button')) return
      box = punkt.querySelector<HTMLInputElement>(':scope > input.haken, :scope > p > input.haken')
      if (box) box.checked = !box.checked
    }
    if (box) onHaken(Number(box.dataset.haken), box.checked)
  }

  return <div ref={ref} className="zettel" onClick={klick} dangerouslySetInnerHTML={inhalt} />
}
