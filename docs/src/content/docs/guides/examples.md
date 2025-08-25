---
title: Usage Examples
description: Real-world examples of using AI Triage Assistant
---

# Usage Examples

## Basic Issue Labeling

Automatically label new issues:

```yaml
name: 'Label New Issues'
on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: mattleibow/triage-assistant@v1
        with:
          mode: 'apply-labels'
          apply-labels: true
          ai-token: ${{ secrets.AI_TOKEN }}
```

## Bulk Labeling with Search

Process multiple issues based on a search query:

```yaml
name: 'Bulk Triage'
on:
  schedule:
    - cron: '0 9 * * 1' # Weekly on Mondays

jobs:
  bulk-triage:
    runs-on: ubuntu-latest
    steps:
      - uses: mattleibow/triage-assistant@v1
        with:
          mode: 'apply-labels'
          issue-query: 'state:open created:>@today-30d'
          apply-labels: true
          apply-comment: true
```

## Engagement Scoring

Calculate engagement scores for project prioritization:

```yaml
name: 'Calculate Engagement Scores'
on:
  schedule:
    - cron: '0 9 * * 1' # Weekly

jobs:
  engagement:
    runs-on: ubuntu-latest
    steps:
      - uses: mattleibow/triage-assistant@v1
        with:
          mode: 'engagement-score'
          project: 123
          apply-scores: true
          project-column: 'Priority Score'
```

## Combined Workflow

A comprehensive triage workflow:

```yaml
name: 'Complete Triage'
on:
  issues:
    types: [opened, edited]
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM

jobs:
  label-new:
    if: github.event_name == 'issues'
    runs-on: ubuntu-latest
    steps:
      - uses: mattleibow/triage-assistant@v1
        with:
          mode: 'apply-labels'
          apply-labels: true
          apply-comment: true
          ai-token: ${{ secrets.AI_TOKEN }}

  engagement-scoring:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: mattleibow/triage-assistant@v1
        with:
          mode: 'engagement-score'
          project: ${{ vars.PROJECT_NUMBER }}
          apply-scores: true
```