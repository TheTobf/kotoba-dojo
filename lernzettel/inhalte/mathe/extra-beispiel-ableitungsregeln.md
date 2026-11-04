---
titel: "Beispiel: Ableitungsregeln"
typ: extra
datum: 2026-11-04
kurz: So sieht ein Lernzettel aus – mit Regeln, Beispielen, Selbsttest und Checkliste.
---

> [!MERKE] Das ist ein Beispiel-Lernzettel
> Er zeigt dir, wie deine Lernzettel aufgebaut sind. Deine echten Lernzettel mache ich aus deinen Übungsblättern, Lösungen und Folien – sie erscheinen dann unter **Übungen**.

## Worum geht's?

Die **Ableitung** $f'(x)$ gibt die Steigung von $f$ an der Stelle $x$ an – also wie stark sich $f$ ändert, wenn $x$ ein kleines bisschen wächst. In der Wirtschaft heißt das **Grenz-…**: Grenzkosten $K'(x)$, Grenzerlös $E'(x)$, Grenzgewinn $G'(x)$.

## Grundableitungen

| $f(x)$ | $f'(x)$ |
|---|---|
| $c$ (Konstante) | $0$ |
| $x^n$ | $n\cdot x^{n-1}$ |
| $\sqrt{x} = x^{1/2}$ | $\frac{1}{2\sqrt{x}}$ |
| $\frac{1}{x} = x^{-1}$ | $-\frac{1}{x^2}$ |
| $e^x$ | $e^x$ |
| $a^x$ | $a^x\cdot \ln a$ |
| $\ln x$ | $\frac{1}{x}$ |

## Die Regeln

> [!FORMEL] Faktor- und Summenregel
> $$
> \big(c\cdot f(x)\big)' = c\cdot f'(x) \qquad \big(f(x)+g(x)\big)' = f'(x)+g'(x)
> $$

> [!FORMEL] Produktregel
> $$
> (u\cdot v)' = u'\cdot v + u\cdot v'
> $$

> [!FORMEL] Quotientenregel
> $$
> \left(\frac{u}{v}\right)' = \frac{u'\cdot v - u\cdot v'}{v^2}
> $$
> Merkspruch: „NAZ minus ZAN durch N-Quadrat“ (**N**enner · **A**bleitung **Z**ähler minus **Z**ähler · **A**bleitung **N**enner).

> [!FORMEL] Kettenregel
> $$
> \big(g(h(x))\big)' = g'\big(h(x)\big)\cdot h'(x)
> $$
> „Äußere Ableitung mal innere Ableitung.“

## Vorgehen Schritt für Schritt

1. **Umschreiben:** Wurzeln und Brüche als Potenzen schreiben ($\sqrt{x} = x^{1/2}$, $\frac{1}{x^2} = x^{-2}$).
2. **Struktur erkennen:** Summe? Produkt? Quotient? Verkettung?
3. **Regel anwenden** – Teil für Teil.
4. **Vereinfachen:** zusammenfassen, ausklammern.

## Beispiele

> [!BEISPIEL] Potenz- und Summenregel
> $f(x) = 3x^4 - 2x^2 + 5x - 7$
>
> $f'(x) = 12x^3 - 4x + 5$

> [!BEISPIEL] Produktregel
> $f(x) = x^2\cdot e^x$ mit $u = x^2$, $u' = 2x$, $v = e^x$, $v' = e^x$
>
> $f'(x) = 2x\cdot e^x + x^2\cdot e^x = e^x\,(x^2 + 2x)$

> [!BEISPIEL] Kettenregel
> $f(x) = (3x^2 + 1)^5$ – außen $g(z) = z^5$, innen $h(x) = 3x^2 + 1$
>
> $f'(x) = 5\,(3x^2 + 1)^4 \cdot 6x = 30x\,(3x^2 + 1)^4$

> [!BEISPIEL] Wirtschaft: Grenzkosten
> Kostenfunktion $K(x) = 0{,}5x^2 + 20x + 100$ (x = Stückzahl)
>
> Grenzkosten: $K'(x) = x + 20$. Bei $x = 10$ ist $K'(10) = 30$ – die 11. Einheit kostet also **ungefähr 30 €** zusätzlich (genau: $K(11) - K(10) = 30{,}50$ €).

> [!ACHTUNG]
> - $(u\cdot v)' \neq u'\cdot v'$ – bei Produkten immer die Produktregel!
> - Innere Ableitung vergessen: $(e^{2x})' = 2e^{2x}$, nicht $e^{2x}$.
> - $\left(\frac{1}{x}\right)' = -\frac{1}{x^2}$ – das Minus nicht vergessen.

> [!TIPP]
> Wurzeln und Brüche **immer zuerst** in Potenzen umschreiben – dann reicht oft die Potenzregel und du sparst dir die Quotientenregel.

## Selbsttest

> [!AUFGABE] Aufgabe 1
> Leite ab: $f(x) = 4\sqrt{x} + \frac{2}{x^3}$

> [!LOESUNG]
> Umschreiben: $f(x) = 4x^{1/2} + 2x^{-3}$
>
> $f'(x) = 2x^{-1/2} - 6x^{-4} = \frac{2}{\sqrt{x}} - \frac{6}{x^4}$

> [!AUFGABE] Aufgabe 2
> Leite ab: $f(x) = \frac{x^2}{x + 1}$

> [!LOESUNG]
> $u = x^2$, $u' = 2x$, $v = x + 1$, $v' = 1$
>
> $f'(x) = \frac{2x\,(x + 1) - x^2\cdot 1}{(x + 1)^2} = \frac{x^2 + 2x}{(x + 1)^2}$

> [!AUFGABE] Aufgabe 3
> Leite ab: $f(x) = \ln(x^2 + 4)$

> [!LOESUNG]
> Kettenregel: außen $\ln z \to \frac{1}{z}$, innen $x^2 + 4 \to 2x$
>
> $f'(x) = \frac{2x}{x^2 + 4}$

## Checkliste – das kann ich

- [ ] Ich kenne die Grundableitungen aus der Tabelle auswendig.
- [ ] Ich schreibe Wurzeln und Brüche zuerst in Potenzen um.
- [ ] Ich erkenne, ob Produkt-, Quotienten- oder Kettenregel nötig ist.
- [ ] Ich kann Grenzkosten berechnen und in einem Satz erklären.
- [ ] Ich habe alle drei Selbsttest-Aufgaben ohne Lösung geschafft.
