param(
    [Parameter(Mandatory=$true)]
    [string]$Template,
    [Parameter(Mandatory=$true)]
    [string]$Output,
    [string]$Replacements
)

Write-Host "Processing template: $Template"
Write-Host "Output will be written to: $Output"

# Parse replacements if provided
$replacementDict = @{}
if ($Replacements) {
    Write-Host "Processing replacements:"
    $replacementLines = $Replacements -split "`n" |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -and $_ -match '=' }

    foreach ($line in $replacementLines) {
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $replacementDict[$key] = $value
            Write-Host "    $key = $value"
        }
    }
}

# Get absolute path to template before changing directories
$Template = Resolve-Path $Template

# Check if template file exists
if (-not (Test-Path -Path $Template)) {
    Write-Error "The specified template file '$Template' does not exist. Please check the path and try again."
    exit 1
}

# Ensure output directory exists
$outputDir = Split-Path -Parent $Output
if ($outputDir -and -not (Test-Path -Path $outputDir)) {
    New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
}

# Read the template file
$lines = Get-Content $Template
$outputContent = @()

foreach ($line in $lines) {
    # Replace the placeholders with actual values from the replacements dictionary
    foreach ($key in $replacementDict.Keys) {
        $placeholder = "{{$key}}"
        $line = $line.Replace($placeholder, $replacementDict[$key])
    }

    # Check for EXEC: command prefix
    if ($line -match "^EXEC:\s*(.+)$") {

        # Extract the command part
        $command = $matches[1]
        Write-Host "Executing command:"
        Write-Host "    $command"

        try {
            # Execute the command
            $result = Invoke-Expression $command
            Write-Host "Command output:"
            foreach ($resultLine in $result) {
                Write-Host "    $resultLine"
            }

            # Append the result to output content
            $outputContent += $result
        } catch {
            Write-Error "ERROR executing command '$command': $_"
            exit 1
        }
    } else {
        # Keep original line
        $outputContent += $line
    }
}

# Save the processed content to the output file
$outputFilename = Split-Path -Leaf $Output
Set-Content -Path $outputFilename -Value $outputContent -ErrorAction Stop

# Log the created prompt for debugging
Write-Host ""
Write-Host "Created prompt from template:"
Write-Host ""
Get-Content $outputFilename
