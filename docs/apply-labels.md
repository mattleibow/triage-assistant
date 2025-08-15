# Apply Labels Sub-Action

The `apply-labels` sub-action focuses on AI-powered label application and issue commenting.

## Usage

```yaml
- name: Apply labels to issue
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    ai-token: ${{ secrets.AI_TOKEN }}
    template: 'multi-label'
    apply-labels: true
    apply-comment: true
```

## Inputs

| Name             | Description                                                 | Default               | Required |
| ---------------- | ----------------------------------------------------------- | --------------------- | -------- |
| `token`          | GitHub token for API access                                 | `''`                  | No       |
| `fallback-token` | Fallback GitHub token for API access                        | `${{ github.token }}` | No       |
| `ai-endpoint`    | Endpoint to use for AI inference                            | `''`                  | No       |
| `ai-model`       | Model to use for AI inference                               | `''`                  | No       |
| `ai-token`       | Token for AI inference                                      | `''`                  | No       |
| `issue`          | The issue number of the issue to triage                     | `''`                  | No       |
| `template`       | Triage template to use                                      | `multi-label`         | No       |
| `label`          | The specific label to use                                   | `''`                  | No       |
| `label-prefix`   | Prefix for label search (e.g., platform/, area-, etc.)      | `''`                  | No       |
| `apply-labels`   | Whether to apply labels to the issue                        | `false`               | No       |
| `apply-comment`  | Whether to comment on the issue with the AI response        | `false`               | No       |
| `comment-footer` | Footer text to append to the AI response comment            | Default disclaimer    | No       |
| `dry-run`        | Whether to run the action in dry-run mode (no changes made) | `false`               | No       |

## Outputs

| Name            | Description                                       |
| --------------- | ------------------------------------------------- |
| `response-file` | The file that contains the result of AI inference |

## Triage Templates

### AI-Powered Triage Templates

- **`single-label`**: Selects the best single label from available options
- **`multi-label`**: Can select multiple relevant labels
- **`regression`**: Specifically checks if an issue is a regression
- **`missing-info`**: Identifies issues that need more information

## Examples

### Basic Single Label Application

```yaml
- name: Determine area label
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    label-prefix: 'area-'
    template: 'single-label'
    apply-labels: true
```

### Multi-Label with Comments

```yaml
- name: Apply multiple labels
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'multi-label'
    apply-labels: true
    apply-comment: true
    comment-footer: 'Automated triage by AI assistant'
```

### Regression Detection

```yaml
- name: Check for regression
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    label: 'regression'
    template: 'regression'
    apply-labels: true
```

### Platform-Specific Labeling

```yaml
- name: Apply platform labels
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    label-prefix: 'platform/'
    template: 'multi-label'
    apply-labels: true
```

### Dry Run Testing

```yaml
- name: Test label application
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'multi-label'
    label-prefix: 'area-'
    dry-run: true
```

## Required Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  models: read # To access GitHub Models for AI inference
```
