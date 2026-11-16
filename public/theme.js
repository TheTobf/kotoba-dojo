// Läuft vor dem ersten Zeichnen: setzt data-theme="light|dark" am <html>-Element.
// Die Einstellung (system/hell/dunkel) liegt nur auf dem Gerät. Schlüssel wie in src/lib/settings.ts.
;(function () {
  var choice = 'system'
  try {
    choice = JSON.parse(localStorage.getItem('kd.settings') || '{}').theme || 'system'
  } catch (e) {}
  var dark = choice === 'dunkel' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
})()
