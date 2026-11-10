$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$propsPath = Join-Path $PSScriptRoot 'maven-wrapper.properties'
$line = Get-Content $propsPath | Where-Object { $_ -match '^distributionUrl=' } | Select-Object -First 1
if (-not $line) { throw 'Missing distributionUrl in maven-wrapper.properties' }
$url = $line.Substring('distributionUrl='.Length)
$version = '3.9.9'
$distRoot = Join-Path $projectRoot '.mvn\dist'
$mavenDir = Join-Path $distRoot "apache-maven-$version"
$mvnCmd = Join-Path $mavenDir 'bin\mvn.cmd'
if (-not (Test-Path $mvnCmd)) {
    New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
    $zip = Join-Path $distRoot "apache-maven-$version-bin.zip"
    Write-Host "Downloading Apache Maven $version (first run only)..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
        Expand-Archive -LiteralPath $zip -DestinationPath $distRoot -Force
    } catch {
        Write-Error "Cannot download Maven. Check Internet access or download manually from https://maven.apache.org/download.cgi. Details: $_"
        exit 1
    } finally {
        if (Test-Path $zip) { Remove-Item $zip -Force }
    }
}
if (-not (Test-Path $mvnCmd)) { throw "Maven executable missing: $mvnCmd" }
Push-Location $projectRoot
try {
    & $mvnCmd @args
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
