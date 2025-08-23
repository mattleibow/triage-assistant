# AI Triage Assistant

[![GitHub Super-Linter](https://github.com/mattleibow/triage-assistant/actions/workflows/check-linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mattleibow/triage-assistant/actions/workflows/check-ci.yml/badge.svg)
[![Check dist/](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An AI-powered GitHub Action that provides sophisticated issue and pull request triage capabilities with explicit
mode-based operation. Features include AI-powered label application using large language models and comprehensive
engagement scoring for project prioritization.

## Features

- **Explicit Mode Selection**: Choose between `apply-labels` and `engagement-score` modes for clear operation intent
- **AI-Powered Triage & Labelling**: Automatically analyze issue content and apply appropriate labels using advanced
  language models
- **Engagement Scoring**: Calculate numerical engagement scores based on community activity and interaction
- **Batch Configuration**: Labelling and triage processes multiple label groups from `.triagerc.yml` configuration
- **GitHub Projects Integration**: Automatically update project fields with calculated engagement scores
- **Sub-Action Architecture**: Clean, focused sub-actions for specific functionality (`apply-labels`,
  `engagement-score`)
- **Flexible Configuration**: Support for custom AI models, endpoints, and extensive configuration options
- **Dry-Run Support**: Test configurations safely without making actual changes

## Usage

The action operates in two distinct modes, selected via the `mode` parameter:

- **`apply-labels`** (default): AI-powered label application using batch configuration from `.triagerc.yml`
- **`engagement-score`**: Calculate and apply engagement scores to GitHub Projects

### Labelling Mode (Default)

The labelling mode processes multiple label groups configured in your `.triagerc.yml` file:

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
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Apply labels with AI triage
        uses: mattleibow/triage-assistant@v1
        with:
          mode: 'apply-labels' # default, can be omitted
          issue: ${{ github.event.number }}
          apply-labels: true
          apply-comment: true
```

### Engagement Score Mode

Calculate and apply engagement scores to GitHub Projects:

```yaml
name: 'Calculate Engagement Scores'

on:
  schedule:
    - cron: '0 9 * * 1' # Weekly on Mondays
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read
  repository-projects: write

jobs:
  engagement:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Calculate engagement scores
        uses: mattleibow/triage-assistant@v1
        with:
          mode: 'engagement-score'
          project: 123
          apply-scores: true
          project-column: 'Engagement Score'
```

## Sub-Actions

The triage assistant provides **sub-actions** for focused functionality, similar to GitHub's cache action. Each
sub-action has a clean interface with only the inputs relevant to its specific purpose.

### Available Sub-Actions

#### `mattleibow/triage-assistant/apply-labels`

Focuses on AI-powered label application and issue commenting using batch configuration from `.triagerc.yml`.

```yaml
- name: Apply labels to issue
  uses: mattleibow/triage-assistant/apply-labels@v1
  with:
    issue: ${{ github.event.number }}
    apply-labels: true
    apply-comment: true
```

#### `mattleibow/triage-assistant/engagement-score`

Focuses on calculating and applying engagement scores to project issues.

```yaml
- name: Calculate engagement scores
  uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    project: 123
    apply-scores: true
```

### Sub-Action Benefits

- **Cleaner configuration**: Only the inputs relevant to each specific function
- **Better discoverability**: Clear separation of concerns
- **Easier maintenance**: Focused documentation and examples
- **Explicit operation**: No ambiguity about what the action will do

## Inputs

### General Inputs

| Name             | Description                                        | Default                 | Required |
| ---------------- | -------------------------------------------------- | ----------------------- | -------- |
| `mode`           | Operation mode: `apply-labels`, `engagement-score` | `apply-labels`          | No       |
| `issue`          | The issue number to triage                         | Current issue/PR number | No       |
| `token`          | GitHub token for API access                        | `''`                    | No       |
| `fallback-token` | Fallback GitHub token for API access               | `${{ github.token }}`   | No       |
| `dry-run`        | Run in dry-run mode without making changes         | `false`                 | No       |

### Labelling Mode Inputs

| Name             | Description                               | Default            | Required |
| ---------------- | ----------------------------------------- | ------------------ | -------- |
| `apply-labels`   | Whether to apply labels to the issue      | `false`            | No       |
| `apply-comment`  | Whether to add a comment with AI analysis | `false`            | No       |
| `comment-footer` | Footer text for AI comments               | Default disclaimer | No       |

### Engagement Scoring Mode Inputs

| Name             | Description                                         | Default            | Required |
| ---------------- | --------------------------------------------------- | ------------------ | -------- |
| `project`        | GitHub Project number for engagement scoring        | `''`               | No       |
| `project-column` | Project field name to update with engagement scores | `Engagement Score` | No       |
| `apply-scores`   | Whether to apply engagement scores to project items | `false`            | No       |

### AI Configuration Inputs

| Name          | Description                   | Default                | Required |
| ------------- | ----------------------------- | ---------------------- | -------- |
| `ai-token`    | Custom AI token for inference | Uses GitHub token      | No       |
| `ai-endpoint` | Custom AI endpoint URL        | GitHub Models endpoint | No       |
| `ai-model`    | AI model to use for inference | `openai/gpt-4o`        | No       |

## Outputs

| Name            | Description                                        |
| --------------- | -------------------------------------------------- |
| `response-file` | Path to the file containing the AI analysis result |

## Configuration

### Labelling Configuration

The labelling mode uses a `.triagerc.yml` configuration file to define multiple label groups that are processed
automatically. The system looks for configuration in this order:

1. `.triagerc.yml` in the repository root
2. `.github/.triagerc.yml` in the .github directory

#### Labelling Example

Create a `.triagerc.yml` file in your repository root:

```yaml
# Label groups configuration
labels:
  groups:
    # Multi-label group - can apply multiple labels
    overlap:
      labelPrefix: 'overlap-'
      template: 'multi-label'

    # Single-label group - applies one best label
    area:
      labelPrefix: 'area-'
      template: 'single-label'

    # Regression detection - checks for specific condition
    regression:
      label: 'regression'
      template: 'regression'

    # Missing info detection
    info:
      label: 'needs-info'
      template: 'missing-info'
```

#### Available Templates

- **`multi-label`**: Can select multiple relevant labels from a prefix group
- **`single-label`**: Selects the best single label from a prefix group
- **`regression`**: Specifically checks if an issue is a regression
- **`missing-info`**: Identifies issues that need more information

### Engagement Scoring Configuration

Customize engagement scoring weights in the same `.triagerc.yml` file:

```yaml
# Engagement scoring configuration
engagement:
  weights:
    comments: 3 # Weight for number of comments
    reactions: 1 # Weight for reactions (👍, ❤️, 🎉, etc.)
    contributors: 2 # Weight for number of unique contributors
    lastActivity: 1 # Weight for recency of last activity
    issueAge: 1 # Weight for issue age factor
    linkedPullRequests: 2 # Weight for linked pull requests
```

## Engagement Scoring System

The engagement scoring system provides a data-driven approach to prioritizing issues based on community activity and
involvement. It calculates numerical scores using a configurable weighted algorithm that considers multiple factors.

### Engagement Scoring Configuration

The engagement scoring weights can be customized using a YAML configuration file. The system looks for configuration in
the following order:

1. `.triagerc.yml` in the repository root
2. `.github/.triagerc.yml` in the .github directory

If no configuration file is found, the system uses sensible defaults.

#### Engagement Scoring Example

Create a `.triagerc.yml` file in your repository root:

```yaml
# Triage Assistant Configuration
engagement:
  weights:
    # Weight for number of comments (default: 3)
    comments: 3

    # Weight for reactions (👍, ❤️, 🎉, etc.) (default: 1)
    reactions: 1

    # Weight for number of unique contributors (default: 2)
    contributors: 2

    # Weight for recency of last activity (default: 1)
    lastActivity: 1

    # Weight for issue age factor (default: 1)
    issueAge: 1

    # Weight for linked pull requests (default: 2)
    linkedPullRequests: 2
```

#### Custom Weight Examples

**Emphasize highly discussed issues:**

```yaml
engagement:
  weights:
    comments: 5
    contributors: 3
    reactions: 1
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
```

**Focus on active development:**

```yaml
engagement:
  weights:
    linkedPullRequests: 5
    lastActivity: 3
    comments: 2
    contributors: 2
    reactions: 1
    issueAge: 1
```

### How It Works

The engagement scoring algorithm analyzes the following configurable factors:

- **Comments** - Number of comments on the issue
- **Reactions** - Total reactions (👍, 🎉, ❤️, etc.)
- **Contributors** - Number of unique contributors
- **Time Factors** - Days since last activity and issue age
- **Pull Requests** - Number of linked pull requests

The final score is calculated using your configured weights (or defaults if not specified):

```txt
Score = (Comments × weight) + (Reactions × weight) + (Contributors × weight) +
        (Time Factors × weight) + (Pull Requests × weight)
```

### Usage Modes

#### Project-Wide Engagement Scoring

Calculate engagement scores for all issues in a GitHub Project:

```yaml
- name: Calculate engagement scores for project
  uses: mattleibow/triage-assistant@v1
  with:
    mode: engagement-score
    project: 1 # Your project number
    apply-scores: true
    project-column: 'Engagement Score'
```

#### Single Issue Engagement Scoring

Calculate engagement score for a specific issue:

```yaml
- name: Calculate engagement score for issue
  uses: mattleibow/triage-assistant@v1
  with:
    mode: engagement-score
    issue: 123 # Specific issue number
    apply-scores: false # Just calculate, don't update
```

### Score Interpretation

- **High Scores (>50)** - Issues with significant community engagement that may need immediate attention
- **Medium Scores (10-50)** - Issues with moderate activity that have potential for growth
- **Low Scores (<10)** - Issues with limited engagement that may need promotion or closure
- **Historic Comparison** - The system also calculates previous week scores to show activity trends

### Algorithm Details

The engagement score is calculated using your configured weights. If no configuration file is provided, the system uses
these default weights:

```yaml
engagement:
  weights:
    comments: 3 # Discussion volume indicates high interest
    reactions: 1 # Emotional engagement and community sentiment
    contributors: 2 # Diversity of input reflects broad interest
    lastActivity: 1 # Recent activity indicates current relevance
    issueAge: 1 # Issue age for prioritization
    linkedPullRequests: 2 # Active development work
```

**Customizable Formula:**

```txt
Score = (Comments × comments_weight) + (Reactions × reactions_weight) +
        (Contributors × contributors_weight) + (Time Factors × time_weights) +
        (Pull Requests × pr_weight)
```

Where each weight can be customized in your `.triagerc.yml` configuration file.

The algorithm also calculates a "previous score" based on activity from 7 days ago, allowing for trend analysis and
identification of issues gaining or losing momentum.

### Project Integration

The engagement scoring system integrates with GitHub Projects v2 to automatically update project fields with calculated
scores. This enables:

- Automated issue prioritization based on community engagement
- Visual dashboards showing engagement trends
- Filtering and sorting issues by engagement level
- Historical tracking of issue engagement over time

## AI Model Configuration

The action uses AI models from GitHub Models by default, but supports custom endpoints and models. You can configure the
AI model using inputs or environment variables:

### Using Inputs

```yaml
- name: Triage with custom AI model
  uses: mattleibow/triage-assistant/*@v1
  with:
    ai-model: 'openai/gpt-4o-mini'
    ai-endpoint: 'https://models.github.ai/inference'
    ai-token: ${{ secrets.CUSTOM_AI_TOKEN }}
```

### Using Environment Variables

```yaml
env:
  TRIAGE_AI_MODEL: openai/gpt-4o-mini # Use a specific model
  TRIAGE_AI_ENDPOINT: https://models.github.ai/inference # Custom endpoint
  TRIAGE_AI_TOKEN: ${{ secrets.CUSTOM_AI_TOKEN }} # Custom token
```

### Supported Models

The action works with any OpenAI-compatible API. Popular models include:

- `openai/gpt-4o` (default) - Most capable, higher cost
- `openai/gpt-4o-mini` - Faster and more cost-effective
- `openai/gpt-3.5-turbo` - Budget-friendly option

**Note:** The action automatically falls back to using your GitHub token for authentication if no specific AI token is
provided.

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

For a complete example of how to set up automated triage, see the
[triage-labels.yml](./.github/workflows/triage-labels.yml) workflow in this repository.

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
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Calculate engagement scores for project
        uses: mattleibow/triage-assistant@v1
        with:
          mode: engagement-score
          project: 1 # Replace with your project number
          apply-scores: true
          project-column: 'Engagement Score'
          dry-run: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Calculate engagement score for specific issue
        uses: mattleibow/triage-assistant@v1
        with:
          mode: engagement-score
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
      - name: Checkout repository
        uses: actions/checkout@v5

      # Step 1: Apply AI-powered labels using batch configuration
      - name: Apply labels from configuration
        uses: mattleibow/triage-assistant@v1
        with:
          mode: apply-labels
          issue: ${{ github.event.issue.number }}
          apply-labels: true
          apply-comment: true

      # Step 2: Calculate engagement score
      - name: Calculate engagement score
        uses: mattleibow/triage-assistant@v1
        with:
          mode: engagement-score
          issue: ${{ github.event.issue.number }}
          apply-scores: true
          project: 1 # Your project number
          project-column: 'Engagement Score'
```

## Customization

The action automatically discovers available labels in your repository and uses them for triage based on your
`.triagerc.yml` configuration. Make sure your repository has appropriate labels with descriptive names and descriptions
for best results.

For label groups with prefixes (e.g., `area-api`, `area-docs`, `platform/android`), configure them in your
`.triagerc.yml` file using the `labelPrefix` property to focus the AI on specific label categories.

The batch configuration approach eliminates the need for multiple workflow steps - all label groups are processed
automatically in a single action invocation.

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
