import Placeholder from '../components/Placeholder'

export default function Quiz() {
  return (
    <Placeholder title="Quiz" jp="クイズ" phase={4} items={[
      'Lückentext mit Multiple Choice',
      'Eintippen (Romaji → Kana)',
      'Hör-Modus',
    ]} />
  )
}
