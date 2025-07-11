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
        uses: mattleibow/triage-assistant@v1
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
    uses: mattleibow/triage-assistant@v1
    with:
      label-prefix: 'overlap-'
      template: 'multi-label'

  - name: Determine area label
    uses: mattleibow/triage-assistant@v1
    with:
      label-prefix: 'area-'
      template: 'single-label'

  - name: Check for regression
    uses: mattleibow/triage-assistant@v1
    with:
      label: 'regression'
      template: 'regression'

  - name: Apply all labels and add comment
    uses: mattleibow/triage-assistant@v1
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
        uses: mattleibow/triage-assistant@v1
        with:
          issue: ${{ inputs.issue_number }}
          template: 'single-label'
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true
```

## Inputs

| Name             | Description                                                                  | Default                 | Required |
| ---------------- | ---------------------------------------------------------------------------- | ----------------------- | -------- |
| `issue`          | The issue number to triage                                                   | Current issue/PR number | No       |
| `token`          | GitHub token for API access                                                  | `${{ github.token }}`   | No       |
| `template`       | Triage template: `multi-label`, `single-label`, `regression`, `missing-info` | `''`                    | No       |
| `label`          | Specific label to evaluate                                                   | `''`                    | No       |
| `label-prefix`   | Prefix for label search (e.g., `area-`, `platform/`)                         | `''`                    | No       |
| `apply-labels`   | Whether to apply labels to the issue                                         | `false`                 | No       |
| `apply-comment`  | Whether to add a comment with AI analysis                                    | `false`                 | No       |
| `comment-footer` | Footer text for AI comments                                                  | Default disclaimer      | No       |

## Outputs

| Name            | Description                                        |
| --------------- | -------------------------------------------------- |
| `response-file` | Path to the file containing the AI analysis result |

## Triage Templates

The action supports several triage templates:

- **`single-label`**: Selects the best single label from available options
- **`multi-label`**: Can select multiple relevant labels
- **`regression`**: Specifically checks if an issue is a regression

## AI Model Configuration

The action uses AI models from GitHub Models by default. You can configure the model using environment variables:

```yaml
env:
  TRIAGE_AI_MODEL: openai/gpt-4o-mini # Use a specific model
  TRIAGE_AI_ENDPOINT: https://models.github.ai/inference # Custom endpoint
```

## Permissions

The action requires the following permissions:

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  models: read # To access GitHub Models for AI inference
```

## Example: Complete Triage Setup

For a complete example of how to set up automated triage, see the [triage.yml](./.github/workflows/triage.yml) workflow
in this repository.

## Customization

The action automatically discovers available labels in your repository and uses them for triage. Make sure your
repository has appropriate labels with descriptive names and descriptions for best results.

For labels with prefixes (e.g., `area-api`, `area-docs`, `platform/android`), use the `label-prefix` input to focus the
AI on specific label categories.

## Troubleshooting

- Ensure your GitHub token has the necessary permissions
- Check that the AI model you're using is available in GitHub Models
- Verify that labels exist in your repository before trying to apply them
- Review the AI response file output for detailed analysis information

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
