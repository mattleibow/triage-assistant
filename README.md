# AI Triage Assistant

[![GitHub Super-Linter](https://github.com/mattleibow/triage-assistant/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mattleibow/triage-assistant/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mattleibow/triage-assistant/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An AI-powered GitHub Action that automatically triages issues and pull requests by analyzing their content and applying
appropriate labels using large language models.

## Usage

### Basic Triage Workflow

Create a workflow file (e.g., `.github/workflows/triage.yml`) to automatically triage new issues and pull requests:

```yaml
name: 'Triage Issues and Pull Requests'

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

permissions:
  contents: read
  issues: write
  pull-requests: write
  models: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Determine area label
        uses: mattleibow/triage-assistant@v0
        with:
          label-prefix: 'area-'
          template: 'single-label'
          apply-labels: true
```

### Advanced Multi-Step Triage

For more sophisticated triage workflows, you can use multiple steps with different templates:

```yaml
steps:
  - name: Determine overlap labels
    uses: mattleibow/triage-assistant@v0
    with:
      label-prefix: 'overlap-'
      template: 'multi-label'

  - name: Determine area label
    uses: mattleibow/triage-assistant@v0
    with:
      label-prefix: 'area-'
      template: 'single-label'

  - name: Check for regression
    uses: mattleibow/triage-assistant@v0
    with:
      label: 'regression'
      template: 'regression'

  - name: Apply all labels and add comment
    uses: mattleibow/triage-assistant@v0
    with:
      apply-labels: true
      apply-comment: true
```

### Manual Triage

You can also trigger triage manually using workflow dispatch:

```yaml
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to triage'
        required: true
        type: number

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Triage specific issue
        uses: mattleibow/triage-assistant@v0
        with:
          issue: ${{ inputs.issue_number }}
          template: 'single-label'
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true
```

## Inputs

### Triage Inputs

| Name             | Description                                                                                      | Default                 | Required |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | -------- |
| `issue`          | The issue number to triage                                                                       | Current issue/PR number | No       |
| `token`          | GitHub token for API access                                                                      | `${{ github.token }}`   | No       |
| `template`       | Triage template: `multi-label`, `single-label`, `regression`, `missing-info`, `engagement-score` | `''`                    | No       |
| `label`          | Specific label to evaluate                                                                       | `''`                    | No       |
| `label-prefix`   | Prefix for label search (e.g., `area-`, `platform/`)                                             | `''`                    | No       |
| `apply-labels`   | Whether to apply labels to the issue                                                             | `false`                 | No       |
| `apply-comment`  | Whether to add a comment with AI analysis                                                        | `false`                 | No       |
| `comment-footer` | Footer text for AI comments                                                                      | Default disclaimer      | No       |

### Engagement Scoring Inputs

| Name             | Description                                         | Default            | Required |
| ---------------- | --------------------------------------------------- | ------------------ | -------- |
| `project`        | GitHub Project number for engagement scoring        | `''`               | No       |
| `project-column` | Project field name to update with engagement scores | `Engagement Score` | No       |
| `apply-scores`   | Whether to apply engagement scores to project items | `false`            | No       |

### General Inputs

| Name          | Description                                | Default                | Required |
| ------------- | ------------------------------------------ | ---------------------- | -------- |
| `dry-run`     | Run in dry-run mode without making changes | `false`                | No       |
| `ai-token`    | Custom AI token for inference              | Uses GitHub token      | No       |
| `ai-endpoint` | Custom AI endpoint URL                     | GitHub Models endpoint | No       |
| `ai-model`    | AI model to use for inference              | `openai/gpt-4o`        | No       |

## Outputs

| Name            | Description                                        |
| --------------- | -------------------------------------------------- |
| `response-file` | Path to the file containing the AI analysis result |

## Triage Templates

The action supports several triage templates:

### AI-Powered Triage Templates

- **`single-label`**: Selects the best single label from available options
- **`multi-label`**: Can select multiple relevant labels
- **`regression`**: Specifically checks if an issue is a regression
- **`missing-info`**: Identifies issues that need more information

### Engagement Scoring Template

- **`engagement-score`**: Calculates numerical engagement scores for issues based on community activity

## Engagement Scoring System

The engagement scoring system provides a data-driven approach to prioritizing issues based on community activity and
involvement. It calculates numerical scores using a weighted algorithm that considers multiple factors.

### How It Works

The engagement scoring algorithm analyzes the following factors:

- **Comments** (Weight: 3) - Number of comments on the issue
- **Reactions** (Weight: 1) - Total reactions (👍, 🎉, ❤️, etc.)
- **Contributors** (Weight: 2) - Number of unique contributors
- **Time Factors** (Weight: 1) - Days since last activity and issue age
- **Pull Requests** (Weight: 2) - Number of linked pull requests

### Usage Modes

#### Project-Wide Engagement Scoring

Calculate engagement scores for all issues in a GitHub Project:

```yaml
- name: Calculate engagement scores for project
  uses: mattleibow/triage-assistant@v0
  with:
    template: engagement-score
    project: 1 # Your project number
    apply-scores: true
    project-column: 'Engagement Score'
```

#### Single Issue Engagement Scoring

Calculate engagement score for a specific issue:

```yaml
- name: Calculate engagement score for issue
  uses: mattleibow/triage-assistant@v0
  with:
    template: engagement-score
    issue: 123 # Specific issue number
    apply-scores: false # Just calculate, don't update
```

### Score Interpretation

- **High Scores (>50)** - Issues with significant community engagement that may need immediate attention
- **Medium Scores (10-50)** - Issues with moderate activity that have potential for growth
- **Low Scores (<10)** - Issues with limited engagement that may need promotion or closure
- **Historic Comparison** - The system also calculates previous week scores to show activity trends

### Algorithm Details

The engagement score is calculated using the following formula:

```pwsh
Score = (Comments × 3) + (Reactions × 1) + (Contributors × 2) + (Time Factors × 1) + (Pull Requests × 2)
```

Where:

- **Comments**: Total number of comments on the issue
- **Reactions**: Sum of all reaction types (👍, 👎, 😄, 🎉, 😕, ❤️, 🚀, 👀)
- **Contributors**: Number of unique users who have commented or reacted
- **Time Factors**: Calculated based on days since last activity and issue age
- **Pull Requests**: Number of pull requests that reference the issue

The algorithm also calculates a "previous score" based on activity from 7 days ago, allowing for trend analysis and
identification of issues gaining or losing momentum.

### Project Integration

The engagement scoring system integrates with GitHub Projects v2 to automatically update project fields with calculated
scores. This enables:

- Automated issue prioritization based on community engagement
- Visual dashboards showing engagement trends
- Filtering and sorting issues by engagement level
- Historical tracking of issue engagement over time

### Required Permissions

For engagement scoring, ensure your workflow has these permissions:

```yaml
permissions:
  contents: read
  issues: read
  pull-requests: read
  repository-projects: write # For updating project fields
```

## AI Model Configuration

The action uses AI models from GitHub Models by default. You can configure the model using environment variables:

```yaml
env:
  TRIAGE_AI_MODEL: openai/gpt-4o-mini # Use a specific model
  TRIAGE_AI_ENDPOINT: https://models.github.ai/inference # Custom endpoint
```

## Permissions

The action requires different permissions depending on the features used:

### Basic Triage Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  models: read # To access GitHub Models for AI inference
```

### Engagement Scoring Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: read # To read issue data for scoring
  pull-requests: read # To read PR data for scoring
  repository-projects: write # To update project fields with scores
  models: read # To access GitHub Models (if AI features are used)
```

## Example: Complete Triage Setup

For a complete example of how to set up automated triage, see the [triage.yml](./.github/workflows/triage.yml) workflow
in this repository.

### Example: Engagement Scoring Workflow

Here's a complete workflow that calculates engagement scores for all issues in a project:

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
  repository-projects: write

jobs:
  engagement-scoring:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement scores for project
        uses: mattleibow/triage-assistant@v0
        with:
          template: engagement-score
          project: 1 # Replace with your project number
          apply-scores: true
          project-column: 'Engagement Score'
          dry-run: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Calculate engagement score for specific issue
        uses: mattleibow/triage-assistant@v0
        with:
          template: engagement-score
          issue: ${{ github.event.issue.number }}
          apply-scores: false
        if: github.event_name == 'issues' && github.event.action == 'opened'
```

### Example: Combined Triage and Engagement Workflow

```yaml
name: 'Complete Issue Triage'

on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  pull-requests: write
  repository-projects: write
  models: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      # Step 1: Apply AI-powered labels
      - name: Apply area labels
        uses: mattleibow/triage-assistant@v0
        with:
          template: multi-label
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true

      # Step 2: Calculate engagement score
      - name: Calculate engagement score
        uses: mattleibow/triage-assistant@v0
        with:
          template: engagement-score
          issue: ${{ github.event.issue.number }}
          apply-scores: true
          project: 1 # Your project number
          project-column: 'Engagement Score'
```

## Customization

The action automatically discovers available labels in your repository and uses them for triage. Make sure your
repository has appropriate labels with descriptive names and descriptions for best results.

For labels with prefixes (e.g., `area-api`, `area-docs`, `platform/android`), use the `label-prefix` input to focus the
AI on specific label categories.

## Troubleshooting

### General Issues

- Ensure your GitHub token has the necessary permissions
- Check that the AI model you're using is available in GitHub Models
- Verify that labels exist in your repository before trying to apply them
- Review the AI response file output for detailed analysis information

### Engagement Scoring Issues

- **"Project not found"**: Ensure the project number is correct and the token has `repository-projects: write`
  permission
- **"Field not found"**: Verify the project field name matches exactly (case-sensitive)
- **"No issues found"**: Check that the project contains issues and they are accessible
- **Permission errors**: Ensure your workflow has `repository-projects: write` permission for project updates

### Debugging Tips

- Use `dry-run: true` to test configurations without making changes
- Check the action logs for detailed error messages
- Verify project field names are exactly as they appear in your GitHub Project
- Ensure your GitHub token has access to the specified project

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
