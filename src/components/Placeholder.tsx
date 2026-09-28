export default function Placeholder({ title, jp, phase, items }: {
  title: string
  jp: string
  phase: number
  items: string[]
}) {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">
        {title} <span className="text-sakura">{jp}</span>
      </h1>
      <div className="card p-5">
        <p className="mb-3 text-sm opacity-60">Kommt in Phase {phase}:</p>
        <ul className="list-inside list-disc space-y-1">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
