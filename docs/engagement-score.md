# Engagement Score Sub-Action

The `engagement-score` sub-action calculates and applies engagement scores to GitHub project issues based on community
activity.

## Usage

```yaml
- name: Calculate engagement scores
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    project: 123
    apply-scores: true
```

## Inputs

| Name             | Description                                                               | Default               | Required |
| ---------------- | ------------------------------------------------------------------------- | --------------------- | -------- |
| `token`          | GitHub token for API access                                               | `''`                  | No       |
| `fallback-token` | Fallback GitHub token for API access                                      | `${{ github.token }}` | No       |
| `issue`          | The issue number of the issue to analyze (for single-issue analysis)      | `''`                  | No       |
| `project`        | Project number for engagement scoring (required for project-wide scoring) | `''`                  | No       |
| `project-column` | Project column name to update with engagement scores                      | `Engagement Score`    | No       |
| `apply-scores`   | Whether to apply engagement scores to project items                       | `false`               | No       |
| `dry-run`        | Whether to run the action in dry-run mode (no changes made)               | `false`               | No       |

## Outputs

| Name            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `response-file` | The file that contains the engagement scoring results |

## Usage Modes

### Project-Wide Engagement Scoring

Calculate engagement scores for all issues in a GitHub Project:

```yaml
- name: Calculate engagement scores for project
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 1 # Your project number
    apply-scores: true
    project-column: 'Engagement Score'
```

### Single Issue Engagement Scoring

Calculate engagement score for a specific issue:

```yaml
- name: Calculate engagement score for issue
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    issue: 123 # Specific issue number
    apply-scores: false # Just calculate, don't update
```

## Examples

### Weekly Project Scoring

```yaml
name: 'Calculate Engagement Scores'

on:
  schedule:
    # Run weekly on Mondays at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Allow manual triggering

permissions:
  contents: read
  issues: read
  pull-requests: read
  projects: write

jobs:
  engagement-scoring:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement scores for project
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          project: 1 # Replace with your project number
          apply-scores: true
          project-column: 'Engagement Score'
          dry-run: false
```

### Single Issue Analysis

```yaml
- name: Calculate engagement score for new issue
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    issue: ${{ github.event.issue.number }}
    apply-scores: false
  if: github.event_name == 'issues' && github.event.action == 'opened'
```

### Custom Project Field

```yaml
- name: Update custom engagement field
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 42
    project-column: 'Priority Score'
    apply-scores: true
```

### Dry Run Testing

```yaml
- name: Test engagement scoring
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 1
    dry-run: true
```

## Project Integration

The engagement scoring system integrates with GitHub Projects v2 to automatically update project fields with calculated
scores. This enables:

- Automated issue prioritization based on community engagement
- Visual dashboards showing engagement trends
- Filtering and sorting issues by engagement level
- Historical tracking of issue engagement over time

## Required Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: read # To read issue data for scoring
  pull-requests: read # To read PR data for scoring
  projects: write # To update project fields with scores
```

## Configuration

See [configuration.md](configuration.md) for details on customizing engagement scoring weights through `.triagerc.yml`
files.
