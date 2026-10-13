$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$cancelFile = Join-Path $projectRoot '.tools\cancel-browser-open'
$url = 'http://localhost:8080/'

for ($attempt = 0; $attempt -lt 180; $attempt++) {
    if (Test-Path -LiteralPath $cancelFile) { exit 0 }
    $client = $null
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $client.Connect('127.0.0.1', 8080)
        $client.Close()
        & $env:ComSpec /d /c ('start "" "' + $url + '"')
        exit 0
    } catch {
        if ($client) { $client.Dispose() }
        Start-Sleep -Seconds 2
    }
}
