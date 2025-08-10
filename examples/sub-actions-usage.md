# Example workflows demonstrating sub-action usage

## Using the engagement-score sub-action

```yaml
name: Calculate Engagement Scores for Project Issues

on:
  workflow_dispatch:
    inputs:
      project_number:
        description: 'GitHub Project number'
        required: true
        type: number

jobs:
  engagement-scoring:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate and apply engagement scores
        uses: mattleibow/triage-assistant/engagement-score@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          project: ${{ inputs.project_number }}
          apply-scores: true
          project-column: 'Engagement Score'
```

## Using the apply-labels sub-action

```yaml
name: AI-Powered Issue Triage

on:
  issues:
    types: [opened, edited]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Apply labels to issue
        uses: mattleibow/triage-assistant/apply-labels@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          ai-token: ${{ secrets.AI_TOKEN }}
          issue: ${{ github.event.issue.number }}
          template: 'multi-label'
          apply-labels: true
          apply-comment: true
```

## Single issue engagement analysis

```yaml
name: Analyze Single Issue Engagement

on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to analyze'
        required: true
        type: number

jobs:
  analyze-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement score for issue
        uses: mattleibow/triage-assistant/engagement-score@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          issue: ${{ inputs.issue_number }}
          apply-scores: false
```

## Backward compatibility examples

The original usage still works exactly as before:

```yaml
name: Traditional Usage (Still Supported)

on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Traditional triage approach
        uses: mattleibow/triage-assistant@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          template: 'multi-label'
          apply-labels: true

  engagement:
    runs-on: ubuntu-latest
    steps:
      - name: Traditional engagement scoring
        uses: mattleibow/triage-assistant@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          template: 'engagement-score'
          project: 123
          apply-scores: true
```
