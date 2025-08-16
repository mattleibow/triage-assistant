# AI Triage Assistant

[![GitHub Super-Linter](https://github.com/mattleibow/triage-assistant/actions/workflows/check-linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mattleibow/triage-assistant/actions/workflows/check-ci.yml/badge.svg)
[![Check dist/](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An AI-powered GitHub Action that automatically triages issues and pull requests using advanced language models and calculates engagement scores based on community activity.

## Quick Start

### AI-Powered Label Application

Apply labels automatically to new issues:

```yaml
- name: Apply labels to issue
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'
    label-prefix: 'area-'
    apply-labels: true
```

### Engagement Score Calculation

Calculate engagement scores for project management:

```yaml
- name: Calculate engagement scores
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 123
    apply-scores: true
```

## Sub-Actions

The action provides focused sub-actions for specific functionality:

- **[`apply-labels`](docs/apply-labels.md)** - AI-powered label application and commenting
- **[`engagement-score`](docs/engagement-score.md)** - Community engagement scoring for project prioritization

## Example Workflows

### Single Step Label Application

Automatically apply area labels to new issues:

```yaml
name: 'Auto-Label Issues'

on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  models: read

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Apply area label
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: 'single-label'
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true
```

### Batch Label Application

Apply multiple types of labels in different steps:

```yaml
name: 'Multi-Label Triage'

on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  models: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Apply area labels
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: 'multi-label'
          label-prefix: 'area-'

      - name: Check for regression
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: 'regression'
          label: 'regression'

      - name: Apply all labels and comment
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          apply-labels: true
          apply-comment: true
```

### Engagement Score Calculation

Calculate and track issue engagement over time:

```yaml
name: 'Weekly Engagement Scoring'

on:
  schedule:
    - cron: '0 9 * * 1' # Monday at 9 AM

permissions:
  contents: read
  issues: read
  repository-projects: write

jobs:
  score:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement scores
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          project: 1
          apply-scores: true
          project-column: 'Engagement Score'
```

### Combined Workflow

Apply labels and calculate engagement scores together:

```yaml
name: 'Complete Triage'

on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  repository-projects: write
  models: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Apply labels
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: 'multi-label'
          label-prefix: 'area-'
          apply-labels: true

      - name: Calculate engagement score
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          issue: ${{ github.event.issue.number }}
          project: 1
          apply-scores: true
```

## Configuration

Customize engagement scoring behavior with a `.triagerc.yml` file:

```yaml
engagement:
  weights:
    comments: 3      # Discussion volume
    reactions: 1     # Community sentiment  
    contributors: 2  # Diversity of input
    lastActivity: 1  # Recent activity
    issueAge: 1      # Issue age
    linkedPullRequests: 2  # Active development
```

## Documentation

- **[Configuration Guide](docs/configuration.md)** - Customize behavior with `.triagerc.yml`
- **[Apply Labels Action](docs/apply-labels.md)** - AI-powered label application
- **[Engagement Score Action](docs/engagement-score.md)** - Community engagement scoring
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

## Migration from Template-Based Usage

The sub-action approach is now recommended for cleaner, more focused configuration:

```yaml
# Before (still works)
- uses: mattleibow/triage-assistant@v0.7.0
  with:
    template: 'engagement-score'
    project: 123

# After (recommended)
- uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 123
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
