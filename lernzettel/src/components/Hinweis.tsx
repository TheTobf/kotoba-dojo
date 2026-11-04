import { useEffect, useState } from 'react'
import { meldeAnzeige } from '../hinweis'

export default function Hinweis() {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    meldeAnzeige(setText)
    return () => meldeAnzeige(null)
  }, [])
  if (!text) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status">
      <div className="einblenden rounded-full bg-tinte px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-stone-100 dark:text-tinte">{text}</div>
    </div>
  )
}
