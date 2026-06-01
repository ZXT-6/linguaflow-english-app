param(
    [string]$RepoName = "linguaflow-english-app",
    [switch]$Private
)

$ErrorActionPreference = "Stop"

function Has-Command($Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Has-Command "gh")) {
    throw "GitHub CLI is not installed. Install it from https://cli.github.com/ and run this script again."
}

if (-not (Has-Command "git")) {
    throw "Git is not installed."
}

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    gh auth status *> $null
    if ($LASTEXITCODE -ne 0) {
        gh auth login --hostname github.com --web --git-protocol https
    }

    $owner = gh api user --jq ".login"
    if (-not $owner) {
        throw "Could not determine GitHub username."
    }

    $visibility = if ($Private) { "--private" } else { "--public" }
    $fullName = "$owner/$RepoName"

    if (-not (git config user.name)) {
        git config user.name "LinguaFlow Builder"
    }
    if (-not (git config user.email)) {
        git config user.email "$owner@users.noreply.github.com"
    }

    git branch -M main
    git add .

    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "Initial LinguaFlow app"
    }

    gh repo view $fullName *> $null
    if ($LASTEXITCODE -ne 0) {
        gh repo create $RepoName $visibility --source . --remote origin --push
    } else {
        git remote remove origin 2>$null
        git remote add origin "https://github.com/$fullName.git"
        git push -u origin main
    }

    $body = @{
        source = @{
            branch = "main"
            path = "/"
        }
    } | ConvertTo-Json -Depth 4

    $tempFile = New-TemporaryFile
    Set-Content -LiteralPath $tempFile -Value $body -Encoding UTF8

    gh api --method POST "/repos/$fullName/pages" --input $tempFile *> $null
    if ($LASTEXITCODE -ne 0) {
        gh api --method PUT "/repos/$fullName/pages" --input $tempFile *> $null
    }

    Remove-Item -LiteralPath $tempFile -Force

    $url = "https://$owner.github.io/$RepoName/"
    Write-Host ""
    Write-Host "GitHub Pages is being deployed."
    Write-Host "HTTPS address: $url"
    Write-Host "If it shows 404, wait 1-3 minutes and refresh."
}
finally {
    Pop-Location
}
