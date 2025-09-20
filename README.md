# AI Triage Assistant

[![GitHub Super-Linter](https://github.com/mattleibow/triage-assistant/actions/workflows/check-linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mattleibow/triage-assistant/actions/workflows/check-ci.yml/badge.svg)
[![Check dist/](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An AI-powered GitHub Action that automatically triages issues and pull requests using advanced language models and
calculates engagement scores for project prioritization.

## Quick Start

### 1. Create Configuration File

Create `.github/.triagerc.yml`:

```yaml
# Labeling configuration
labels:
  groups:
    overlap:
      labelPrefix: 'overlap-'
      template: 'multi-label'
    area:
      labelPrefix: 'area-'
      template: 'single-label'
    regression:
      label: 'regression'
      template: 'regression'

# Engagement scoring configuration
engagement:
  weights:
    comments: 3
    reactions: 1
    contributors: 2
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
```

### 2. AI Labeling Workflow

Create `.github/workflows/triage-labels.yml`:

```yaml
name: 'Triage Issues and Pull Requests'

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]
  issue_comment:
    types: [created]
  workflow_dispatch:

permissions:
  contents: read
  issues: write
  pull-requests: write
  models: read

jobs:
  triage:
    name: Triage
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'issues' ||
      github.event_name == 'pull_request' ||
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/triage'))
    env:
      TRIAGE_AI_MODEL: openai/gpt-4o-mini
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Apply Labels and Comment
        uses: mattleibow/triage-assistant/apply-labels@v1
        with:
          apply-labels: true
          apply-comment: true
```

### 3. Engagement Scoring Workflow

Create `.github/workflows/triage-engagement-score.yml`:

```yaml
name: Apply Engagement Scores to Project

on:
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  score:
    name: Calculate Engagement Scores
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Apply Engagement Scores to Project
        uses: mattleibow/triage-assistant/engagement-score@v1
        with:
          token: ${{ secrets.ENGAGEMENT_GITHUB_TOKEN }}
          project: 8
          project-column: 'Engagement Score'
          apply-scores: true
```

## Documentation

📖 **[View Complete Documentation](https://mattleibow.github.io/triage-assistant/)**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
