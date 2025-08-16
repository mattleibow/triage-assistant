# Apply Labels Action

The `apply-labels` sub-action focuses on AI-powered label application and issue commenting using advanced language models.

## Usage

### Basic Label Application

```yaml
- name: Apply labels to issue
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    template: 'multi-label'
    apply-labels: true
    apply-comment: true
```

### Single Label Selection

```yaml
- name: Determine area label
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    label-prefix: 'area-'
    template: 'single-label'
    apply-labels: true
```

### Multi-Step Workflow

```yaml
steps:
  - name: Determine overlap labels
    uses: mattleibow/triage-assistant/apply-labels@v0.7.0
    with:
      label-prefix: 'overlap-'
      template: 'multi-label'

  - name: Determine area label  
    uses: mattleibow/triage-assistant/apply-labels@v0.7.0
    with:
      label-prefix: 'area-'
      template: 'single-label'

  - name: Check for regression
    uses: mattleibow/triage-assistant/apply-labels@v0.7.0
    with:
      label: 'regression'
      template: 'regression'

  - name: Apply all labels and add comment
    uses: mattleibow/triage-assistant/apply-labels@v0.7.0
    with:
      apply-labels: true
      apply-comment: true
```

## Inputs

| Name | Description | Default | Required |
|------|-------------|---------|----------|
| `token` | GitHub token for API access | `${{ github.token }}` | No |
| `fallback-token` | Fallback GitHub token for API access | `${{ github.token }}` | No |
| `issue` | The issue number to triage | Current issue/PR number | No |
| `template` | Triage template: `multi-label`, `single-label`, `regression`, `missing-info` | `''` | No |
| `label` | Specific label to evaluate | `''` | No |
| `label-prefix` | Prefix for label search (e.g., `area-`, `platform/`) | `''` | No |
| `apply-labels` | Whether to apply labels to the issue | `false` | No |
| `apply-comment` | Whether to add a comment with AI analysis | `false` | No |
| `comment-footer` | Footer text for AI comments | Default disclaimer | No |
| `dry-run` | Run in dry-run mode without making changes | `false` | No |
| `ai-token` | Custom AI token for inference | Uses GitHub token | No |
| `ai-endpoint` | Custom AI endpoint URL | GitHub Models endpoint | No |
| `ai-model` | AI model to use for inference | `openai/gpt-4o` | No |

## Outputs

| Name | Description |
|------|-------------|
| `response-file` | Path to the file containing the AI analysis result |

## Templates

### AI-Powered Triage Templates

- **`single-label`**: Selects the best single label from available options
- **`multi-label`**: Can select multiple relevant labels  
- **`regression`**: Specifically checks if an issue is a regression
- **`missing-info`**: Identifies issues that need more information

## AI Model Configuration

### Using Custom Models

```yaml
- name: Triage with custom AI model
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: single-label
    label-prefix: 'area-'
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

steps:
  - name: Apply labels
    uses: mattleibow/triage-assistant/apply-labels@v0.7.0
    with:
      template: 'multi-label'
      apply-labels: true
```

### Supported Models

The action works with any OpenAI-compatible API:

- `openai/gpt-4o` (default) - Most capable, higher cost
- `openai/gpt-4o-mini` - Faster and more cost-effective  
- `openai/gpt-3.5-turbo` - Budget-friendly option

## Required Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  models: read # To access GitHub Models for AI inference
```

## Examples

### Automatic Triage Workflow

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
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          label-prefix: 'area-'
          template: 'single-label'
          apply-labels: true
```

### Manual Triage

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
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          issue: ${{ inputs.issue_number }}
          template: 'single-label'
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true
```

## Workflow Tips

- **Start with analysis**: Run templates without `apply-labels: true` to see AI recommendations first
- **Use prefixes**: The `label-prefix` input helps focus the AI on specific label categories
- **Dry-run testing**: Use `dry-run: true` to test configurations without making changes
- **Review responses**: Check the `response-file` output for detailed AI analysis

## See Also

- [Configuration](configuration.md) - Customizing behavior
- [Engagement Score Action](engagement-score.md) - Community engagement scoring
- [Troubleshooting](troubleshooting.md) - Common issues and solutions