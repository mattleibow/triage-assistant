---
title: Actions
description: Focused functionality with clean interfaces using specialized actions
---

# Actions

AI Triage Assistant provides focused actions for specific functionality. Each action has a clean interface with only the
inputs relevant to its specific purpose.

## Available Actions

### apply-labels

Focused AI-powered label application:

```yaml
- uses: mattleibow/triage-assistant/apply-labels@v1
  with:
    apply-labels: true
    apply-comment: true
```

**Inputs:**

- `apply-labels`: Whether to apply AI-suggested labels
- `apply-comment`: Whether to add AI analysis comments
- `comment-footer`: Custom footer for AI comments
- `issue`: Specific issue number (optional)
- `issue-query`: GitHub search query for bulk processing

### engagement-score

Dedicated engagement scoring:

```yaml
- uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    project: 8
    apply-scores: true
    project-column: 'Engagement Score'
```

**Inputs:**

- `project`: GitHub Project number
- `issue`: Specific issue number (optional)
- `project-column`: Project field name for scores
- `apply-scores`: Whether to update project fields

## Benefits of Focused Actions

### Cleaner Configuration

Each action only exposes relevant inputs:

```yaml
# ✅ Clean - only engagement scoring inputs
- uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    project: 8
    apply-scores: true
```

### Better Discoverability

Actions make it clear what functionality is being used:

- `apply-labels` - Obviously for AI labeling
- `engagement-score` - Obviously for engagement analysis
- No ambiguity about what the action will do

### Easier Maintenance

Focused interfaces mean:

- Simpler documentation for each use case
- Fewer breaking changes when updating
- Clear separation of concerns
- Better testing isolation

### Explicit Operation

Clear, focused functionality:

```yaml
# ✅ Explicit functionality
- uses: mattleibow/triage-assistant/apply-labels@v1
```

## When to Use Actions

### Use Focused Actions When:

- You need only one specific feature
- You want the cleanest possible configuration
- You're building reusable workflow templates
- You prefer explicit over implicit behavior

## Example Workflows

### Separate Jobs for Different Functions

```yaml
name: 'Complete Triage'

on:
  issues:
    types: [opened, edited]

jobs:
  labeling:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      models: read
    steps:
      - uses: mattleibow/triage-assistant/apply-labels@v1
        with:
          apply-labels: true
          apply-comment: true

  engagement:
    runs-on: ubuntu-latest
    if: github.event.action == 'opened'
    permissions:
      issues: read
      repository-projects: write
    steps:
      - uses: mattleibow/triage-assistant/engagement-score@v1
        with:
          project: 1
          apply-scores: true
```

### Conditional Action Usage

```yaml
- name: Label urgent issues
  if: contains(github.event.issue.labels.*.name, 'urgent')
  uses: mattleibow/triage-assistant/apply-labels@v1
  with:
    apply-labels: true

- name: Score all issues
  uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    project: 1
    apply-scores: true
```

### Scheduled Engagement Updates

```yaml
name: 'Weekly Engagement Update'

on:
  schedule:
    - cron: '0 9 * * 1'

jobs:
  engagement:
    runs-on: ubuntu-latest
    permissions:
      issues: read
      repository-projects: write
    steps:
      - uses: mattleibow/triage-assistant/engagement-score@v1
        with:
          project: 1
          apply-scores: true
          project-column: 'Community Interest'
```

## Next Steps

- Try the [Quick Start guide](../../getting-started/quick-start/) with actions
- Learn about [AI-Powered Labeling](../ai-labeling/) features
- Explore [Engagement Scoring](../engagement-scoring/) capabilities
- Check the [Configuration guide](../../getting-started/configuration/) for advanced options
