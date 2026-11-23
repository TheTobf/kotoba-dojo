# Einrichtung „Gestrandet in Japan“ auf Windows – einmal ausführen (PowerShell, kein Admin nötig).
# Installiert Git, Node.js und ffmpeg (per winget), klont kotoba-dojo nach Dokumente\Projekte und installiert die Pakete.
# Mehrfach ausführen schadet nicht: Vorhandenes wird übersprungen bzw. aktualisiert.
$ErrorActionPreference = 'Stop'
$branch = 'ccr-0b3bf917-4jzi1j'
$ziel = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Projekte'
$repo = Join-Path $ziel 'kotoba-dojo'

function Installiere($befehl, $id) {
  if (Get-Command $befehl -ErrorAction SilentlyContinue) { Write-Host "✓ $befehl ist schon da"; return }
  Write-Host "→ installiere $id …"
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'winget fehlt. Bitte im Microsoft Store „App-Installer“ installieren und das Skript erneut starten.'
}
Installiere git 'Git.Git'
Installiere node 'OpenJS.NodeJS.LTS'
Installiere ffmpeg 'Gyan.FFmpeg'

# PATH dieser Sitzung auffrischen, damit frisch installierte Programme sofort gehen
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

New-Item -ItemType Directory -Force -Path $ziel | Out-Null
if (Test-Path (Join-Path $repo '.git')) {
  Write-Host '→ Repo vorhanden, hole neuesten Stand …'
  git -C $repo fetch origin $branch
  git -C $repo checkout $branch
  git -C $repo pull --ff-only origin $branch
} else {
  Write-Host '→ klone kotoba-dojo …'
  git clone -b $branch https://github.com/TheTobf/kotoba-dojo.git $repo
}

Push-Location $repo
npm ci --no-audit --no-fund
node serie/scripts/pruefe-curriculum.mjs
Pop-Location

Write-Host ''
Write-Host "Fertig. Projekt liegt in: $repo"
Write-Host 'Jetzt in der Claude-Desktop-App eine Claude-Code-Sitzung in diesem Ordner öffnen.'
Write-Host 'VOICEVOX und whisper.cpp richtet ein späterer Lauf dieses Skripts ein, sobald die Video-Pipeline fertig ist.'
