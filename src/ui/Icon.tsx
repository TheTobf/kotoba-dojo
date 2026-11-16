/** Eigene, schlichte Linien-Icons (24×24). Keine Icon-Bibliothek, keine Emojis – so bleibt das Bild ruhig. */
import type { SVGProps } from 'react'

const PATHS = {
  home: 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9',
  cards: 'M7 8.5h11a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1ZM8.5 5.5h8',
  story: 'M6 5h9a3 3 0 0 1 3 3v11H9a3 3 0 0 1-3-3V5Zm0 11a3 3 0 0 1 3-3h9M10 9h4',
  speak: 'M5 6.5h14v9.5h-7l-4 3v-3H5V6.5ZM9 10.5h6M9 13h4',
  user: 'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 7.5c.8-3.2 3.6-5 7-5s6.2 1.8 7 5',
  lock: 'M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11M6 11h12v8.5H6V11Zm6 3.5v2',
  check: 'm5.5 12.5 4.5 4.5 8.5-10',
  sound: 'M5 10v4h3l4.5 3.5v-11L8 10H5Zm10.5-.5a3.5 3.5 0 0 1 0 5m2.5-7.5a7 7 0 0 1 0 10',
  slow: 'M5 10v4h3l4.5 3.5v-11L8 10H5Zm11 2h4m-2.5-2.5L20 12l-2.5 2.5',
  arrowRight: 'M5 12h14m-5.5-5.5L19 12l-5.5 5.5',
  arrowLeft: 'M19 12H5m5.5-5.5L5 12l5.5 5.5',
  close: 'm6.5 6.5 11 11m0-11-11 11',
  spark: 'M12 4v4m0 8v4M4 12h4m8 0h4M7 7l2 2m6 6 2 2m0-10-2 2m-6 6-2 2',
  hint: 'M9.5 17.5h5M10 20h4M8 13.5a5.5 5.5 0 1 1 8 0c-.8.9-1.2 1.6-1.3 2.5H9.3c-.1-.9-.5-1.6-1.3-2.5Z',
  mail: 'M4.5 6.5h15v11h-15v-11Zm0 .5 7.5 6 7.5-6',
  external: 'M13 5h6v6m0-6-8.5 8.5M17 14v5H5V7h5',
  download: 'M12 4.5v10m-4-4 4 4 4-4M5 19h14',
  robot: 'M12 4v2.5M7 6.5h10a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2ZM9.5 11v1.5m5-1.5v1.5M9.5 15h5',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
