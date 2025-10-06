---
title: Quick Start
description: Get up and running with AI Triage Assistant in minutes
---

This guide will help you set up AI Triage Assistant in your repository quickly.

## Prerequisites

- A GitHub repository where you want to enable AI triage
- Repository permissions to create GitHub Actions workflows
- Access to GitHub Models (for AI features) or Azure AI services

## Basic Setup

### 1. Create a Workflow File

Create `.github/workflows/triage.yml` in your repository:

```yaml
name: 'AI Triage'

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]
  issue_comment:
    types: [created]

permissions:
  contents: read
  issues: write
  pull-requests: write
  models: read # For GitHub Models access

jobs:
  triage:
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'issues' ||
      github.event_name == 'pull_request' ||
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/triage'))
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: AI Triage
        uses: mattleibow/triage-assistant/apply-labels@v1
        with:
          apply-labels: true
          apply-comment: true
```

### 2. Configure Labels (Optional)

Create `.triagerc.yml` in your repository root to configure label groups:

```yaml
labels:
  groups:
    type:
      labelPrefix: 'type-'
      template: 'single-label'

    priority:
      labelPrefix: 'priority-'
      template: 'single-label'

    area:
      labelPrefix: 'area-'
      template: 'multi-label'

    regression:
      label: 'potential-regression'
      template: 'regression'
```

### 3. Test the Setup

1. Create a new issue in your repository
2. The AI Triage workflow should trigger automatically
3. Check the Actions tab to see the workflow run
4. The issue should receive appropriate labels and an AI-generated comment

## Alternative: Focused Actions

For focused functionality, you can use specific actions:

### Apply Labels Only

```yaml
- uses: mattleibow/triage-assistant/apply-labels@v1
  with:
    apply-labels: true
```

### Engagement Scoring Only

```yaml
- uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    project: 8 # Your project number
    apply-scores: true
```

## Next Steps

- Learn about [Configuration options](../configuration/) for advanced setup
- Explore [AI-Powered Labeling](../../features/ai-labeling/) features
- Set up [Engagement Scoring](../../features/engagement-scoring/) for project prioritization

## Troubleshooting

### Common Issues

**Workflow doesn't trigger**: Check that the workflow file is in `.github/workflows/` and uses the correct event
triggers.

**Permission errors**: Ensure your workflow has the necessary permissions listed in the `permissions` section.

**AI model access issues**: Verify that GitHub Models is available in your repository or configure Azure AI credentials.

For more help, check the [Reference documentation](../../reference/) or
[open an issue](https://github.com/mattleibow/triage-assistant/issues) on GitHub.
