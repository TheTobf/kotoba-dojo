// Browser/GL-Einstellungen für Remotion. Auf dem Laptop (Windows/Mac mit Grafikkarte) nimmt Remotion seinen eigenen
// Browser und „angle“ (GPU). In der Cloud-Testumgebung (Linux ohne GPU) den vorinstallierten Chromium mit „swangle“.
import fs from 'node:fs';

export function browserOptionen() {
  const cloud = process.platform === 'linux' && fs.existsSync('/opt/pw-browsers/chromium');
  const gl = (process.env.SERIE_GL as 'angle' | 'swangle' | undefined) ?? (cloud ? 'swangle' : 'angle');
  return {
    browserExecutable: process.env.SERIE_BROWSER ?? (cloud ? '/opt/pw-browsers/chromium' : null),
    chromiumOptions: { gl },
    logLevel: 'error' as const,
  };
}
