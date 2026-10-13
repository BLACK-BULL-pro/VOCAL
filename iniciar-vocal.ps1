$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolsRoot = Join-Path $projectRoot '.tools'
$mavenRepository = Join-Path $toolsRoot 'repository'
$mavenSettings = Join-Path $toolsRoot 'settings.xml'
$browserWatcher = Join-Path $projectRoot 'abrir-vocal.ps1'
$watcherCancel = Join-Path $toolsRoot 'cancel-browser-open'
$mavenVersion = '3.9.16'
$mavenHome = Join-Path $toolsRoot "apache-maven-$mavenVersion"
$mavenExecutable = Join-Path $mavenHome 'bin\mvn.cmd'

Set-Location $projectRoot

Write-Host 'Iniciando V.O.C.A.L....' -ForegroundColor Cyan

try {
    $javaVersionText = (& cmd.exe /d /c 'java -version 2>&1' | Out-String)
} catch {
    Write-Host 'No se encontró Java. Instala un JDK 21 o posterior y vuelve a ejecutar este archivo.' -ForegroundColor Red
    exit 1
}

$versionMatch = [regex]::Match($javaVersionText, 'version "(?<version>[0-9]+)')
if (-not $versionMatch.Success -or [int]$versionMatch.Groups['version'].Value -lt 21) {
    Write-Host 'V.O.C.A.L. requiere Java 21 o posterior. Instala un JDK 21 y vuelve a ejecutar este archivo.' -ForegroundColor Red
    Write-Host $javaVersionText
    exit 1
}

if (-not (Test-Path $mavenExecutable)) {
    New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
    $archive = Join-Path $toolsRoot "apache-maven-$mavenVersion-bin.zip"
    $checksumFile = "$archive.sha512"
    $baseUrl = "https://downloads.apache.org/maven/maven-3/$mavenVersion/binaries"

    Write-Host "Descargando Maven $mavenVersion en la carpeta local del proyecto..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "$baseUrl/apache-maven-$mavenVersion-bin.zip" -OutFile $archive
        Invoke-WebRequest -Uri "$baseUrl/apache-maven-$mavenVersion-bin.zip.sha512" -OutFile $checksumFile
        $expectedHash = ((Get-Content $checksumFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
        $actualHash = (Get-FileHash -Path $archive -Algorithm SHA512).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) {
            throw 'La verificación SHA-512 de Maven no coincide.'
        }
        Expand-Archive -Path $archive -DestinationPath $toolsRoot -Force
        Remove-Item -LiteralPath $archive, $checksumFile -Force
    } catch {
        Write-Host "No se pudo descargar o verificar Maven: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host 'Comprueba tu conexión a Internet y vuelve a ejecutar el lanzador.'
        exit 1
    }
}

New-Item -ItemType Directory -Path $mavenRepository -Force | Out-Null
$escapedRepository = [System.Security.SecurityElement]::Escape($mavenRepository)
@('<?xml version="1.0" encoding="UTF-8"?>', '<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0">',
  "  <localRepository>$escapedRepository</localRepository>", '</settings>') |
    Set-Content -LiteralPath $mavenSettings -Encoding UTF8

$localUrl = 'http://localhost:8080/'
Write-Host 'Arrancando Spring Boot. La primera ejecución descargará las dependencias del proyecto...' -ForegroundColor Cyan
Write-Host 'Deja abierta esta ventana mientras uses la app. Para detenerla, presiona Ctrl+C.'

Remove-Item -LiteralPath $watcherCancel -Force -ErrorAction SilentlyContinue
$watcherCommand = 'start "" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $browserWatcher + '"'
& $env:ComSpec /d /c $watcherCommand
& $mavenExecutable -s $mavenSettings spring-boot:run
$mavenExitCode = $LASTEXITCODE
New-Item -ItemType File -Path $watcherCancel -Force | Out-Null
if ($mavenExitCode -ne 0) {
    Write-Host 'V.O.C.A.L. no pudo iniciar. Revisa el mensaje de error de Maven que aparece arriba.' -ForegroundColor Red
    exit $mavenExitCode
}
