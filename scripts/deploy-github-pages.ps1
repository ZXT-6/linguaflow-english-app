param(
    [string]$RepoName = "linguaflow-english-app",
    [switch]$Private
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Has-Command($Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-QuietNative($Command) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $Command *> $null
        return $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Wait-ForRepo($FullName) {
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        if ((Invoke-QuietNative { gh api "/repos/$FullName" }) -eq 0) {
            return
        }
        Start-Sleep -Seconds 5
    }

    throw "GitHub repository $FullName was not available after waiting."
}

function Enable-Pages($FullName, $InputFile) {
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        if ((Invoke-QuietNative { gh api "/repos/$FullName/pages" }) -eq 0) {
            if ((Invoke-QuietNative { gh api --method PUT "/repos/$FullName/pages" --input $InputFile }) -eq 0) {
                return
            }
        } elseif ((Invoke-QuietNative { gh api --method POST "/repos/$FullName/pages" --input $InputFile }) -eq 0) {
            return
        }

        Start-Sleep -Seconds 5
    }

    throw "Could not enable GitHub Pages automatically. Open https://github.com/$FullName/settings/pages and set Source to Deploy from a branch, Branch to main, Folder to /root."
}

if (-not (Has-Command "gh")) {
    throw "GitHub CLI is not installed. Install it from https://cli.github.com/ and run this script again."
}

if (-not (Has-Command "git")) {
    throw "Git is not installed."
}

Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    if ((Invoke-QuietNative { gh auth status }) -ne 0) {
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

    $repoExists = $false
    if ((Invoke-QuietNative { gh repo view $fullName }) -eq 0) {
        $repoExists = $true
    }

    if (-not $repoExists) {
        gh repo create $RepoName $visibility --source . --remote origin --push
    } else {
        git remote remove origin 2>$null
        git remote add origin "https://github.com/$fullName.git"
        git push -u origin main
    }

    Wait-ForRepo $fullName

    $body = @{
        source = @{
            branch = "main"
            path = "/"
        }
    } | ConvertTo-Json -Depth 4

    $tempFile = New-TemporaryFile
    Set-Content -LiteralPath $tempFile -Value $body -Encoding UTF8

    Enable-Pages $fullName $tempFile

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
