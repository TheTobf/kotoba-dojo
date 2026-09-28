import Placeholder from '../components/Placeholder'

export default function Vokabeln() {
  return (
    <Placeholder title="Vokabeln" jp="単語" phase={3} items={[
      'Karteikarten mit ganzen Sätzen, Furigana ein/aus',
      'Nochmal / Schwer / Gut / Einfach mit FSRS-Intervallen',
      '„Kenn ich schon" → 7 Tage',
      'Tageslimit für neue Karten',
    ]} />
  )
}
