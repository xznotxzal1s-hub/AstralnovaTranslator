[CmdletBinding()]
param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$EnvFile = ".env",
  [string]$BackendUrl = "http://localhost:18000",
  [string]$FrontendUrl = "http://localhost:13000",
  [int]$TimeoutSeconds = 120,
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[smoke] $Message" -ForegroundColor Cyan
}

function Write-Success {
  param([string]$Message)
  Write-Host "[ok] $Message" -ForegroundColor Green
}

function Invoke-DockerCompose {
  param([string[]]$Arguments)

  & docker compose @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Wait-ForHttpOk {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = "No response yet."

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Write-Success "$Name responded at $Url"
        return
      }

      $lastError = "HTTP $($response.StatusCode)"
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 3
  }

  throw "$Name did not respond successfully at $Url within $TimeoutSeconds seconds. Last error: $lastError"
}

if (-not (Test-Path -LiteralPath $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Environment file not found: $EnvFile. Create it first with: Copy-Item .env.example .env"
}

$composeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile)

try {
  if ($SkipBuild) {
    Write-Step "Skipping docker compose build because -SkipBuild was provided."
  } else {
    Write-Step "Building Docker images."
    Invoke-DockerCompose -Arguments ($composeArgs + @("build"))
  }

  Write-Step "Starting Docker Compose stack."
  Invoke-DockerCompose -Arguments ($composeArgs + @("up", "-d"))

  Write-Step "Checking backend health endpoint."
  Wait-ForHttpOk -Name "Backend health" -Url "$BackendUrl/health" -TimeoutSeconds $TimeoutSeconds

  Write-Step "Checking frontend page."
  Wait-ForHttpOk -Name "Frontend" -Url $FrontendUrl -TimeoutSeconds $TimeoutSeconds

  Write-Step "Checking same-origin frontend API proxy."
  Wait-ForHttpOk -Name "Frontend API proxy" -Url "$FrontendUrl/api/backend/health" -TimeoutSeconds $TimeoutSeconds

  Write-Success "Docker smoke test completed successfully."
} finally {
  Write-Step "Stopping Docker Compose stack."
  try {
    Invoke-DockerCompose -Arguments ($composeArgs + @("down"))
  } catch {
    Write-Warning "Cleanup failed: $($_.Exception.Message)"
  }
}
