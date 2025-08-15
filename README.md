# AI Triage Assistant

[![GitHub Super-Linter](https://github.com/mattleibow/triage-assistant/actions/workflows/check-linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mattleibow/triage-assistant/actions/workflows/check-ci.yml/badge.svg)
[![Check dist/](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An AI-powered GitHub Action that provides sophisticated issue and pull request triage capabilities. Features include
AI-powered label application using large language models and comprehensive engagement scoring for project
prioritization.

## Quick Start

### Using Sub-Actions (Recommended)

The triage assistant provides focused sub-actions for specific functionality:

#### Apply Labels Sub-Action

```yaml
- name: Apply labels to new issues
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'multi-label'
    label-prefix: 'area-'
    apply-labels: true
    apply-comment: true
```

#### Engagement Score Sub-Action

```yaml
- name: Calculate engagement scores
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 123
    apply-scores: true
```

## Simple Workflow Examples

### Single-Step Label Application

Create `.github/workflows/triage.yml` to automatically label new issues:

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
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Apply area labels
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: 'single-label'
          label-prefix: 'area-'
          apply-labels: true
```

### Batch Workflow with Different Label Types

Apply multiple types of labels in sequence:

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

      - name: Apply platform labels
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: 'multi-label'
          label-prefix: 'platform/'

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

Calculate weekly engagement scores for project prioritization:

```yaml
name: 'Weekly Engagement Scoring'

on:
  schedule:
    - cron: '0 9 * * 1' # Monday 9 AM UTC
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  repository-projects: write

jobs:
  engagement:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate project engagement scores
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          project: 1 # Your project number
          apply-scores: true
          project-column: 'Engagement Score'
```

## Templates

- **`single-label`** - Selects the best single label from available options
- **`multi-label`** - Can select multiple relevant labels
- **`regression`** - Specifically checks if an issue is a regression
- **`missing-info`** - Identifies issues that need more information

## Configuration

Customize engagement scoring weights with `.triagerc.yml`:

```yaml
engagement:
  weights:
    comments: 3
    reactions: 1
    contributors: 2
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
```

## Documentation

For comprehensive documentation, examples, and troubleshooting:

📚 **[Full Documentation](docs/)**

- [Configuration Guide](docs/configuration.md) - .triagerc.yml setup and options
- [Apply Labels Action](docs/apply-labels.md) - Detailed sub-action documentation
- [Engagement Score Action](docs/engagement-score.md) - Scoring system documentation
- [AI Models](docs/ai-models.md) - Model configuration and options
- [Permissions](docs/permissions.md) - Required GitHub permissions
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Example Workflows](docs/examples/) - Additional workflow examples

## Backward Compatibility

The original template-based syntax continues to work:

```yaml
# Still supported
- uses: mattleibow/triage-assistant@v0.7.0
  with:
    template: 'multi-label'
    apply-labels: true
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
