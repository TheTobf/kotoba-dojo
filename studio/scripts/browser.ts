/**
 * Browser-Einstellungen fürs Rendern. Ohne Angabe lädt Remotion seinen eigenen Browser herunter.
 * KOTOBA_BROWSER setzt einen vorhandenen (z. B. in der Cloud-Umgebung). 3D braucht WebGL: „angle“ nutzt die
 * Grafikkarte, „swangle“ rechnet ohne Grafikkarte (langsamer, aber überall).
 */
export const browserOptions = {
  browserExecutable: process.env.KOTOBA_BROWSER || null,
  chromiumOptions: { gl: (process.env.KOTOBA_GL as 'angle' | 'swangle' | undefined) ?? 'angle', enableMultiProcessOnLinux: true },
  logLevel: 'warn' as const,
}
