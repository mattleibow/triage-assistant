# Engagement Score Action

The `engagement-score` sub-action calculates numerical engagement scores for issues based on community activity and
interaction patterns.

## Usage

### Project-Wide Scoring

Calculate engagement scores for all issues in a GitHub Project:

```yaml
- name: Calculate engagement scores for project
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    project: 123
    apply-scores: true
    project-column: 'Engagement Score'
```

### Single Issue Scoring

Calculate engagement score for a specific issue:

```yaml
- name: Calculate engagement score for issue
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    issue: 456
    apply-scores: false
```

## Inputs

| Name             | Description                                  | Default               | Required |
| ---------------- | -------------------------------------------- | --------------------- | -------- |
| `token`          | GitHub token for API access                  | `${{ github.token }}` | No       |
| `fallback-token` | Fallback GitHub token for API access         | `${{ github.token }}` | No       |
| `project`        | GitHub Project number for engagement scoring | `''`                  | No\*     |
| `issue`          | The issue number for single-issue analysis   | `''`                  | No\*     |
| `project-column` | Project field name to update with scores     | `'Engagement Score'`  | No       |
| `apply-scores`   | Whether to apply scores to project items     | `false`               | No       |
| `dry-run`        | Run in dry-run mode without making changes   | `false`               | No       |

\*Either `project` or `issue` must be specified.

## Outputs

| Name            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `response-file` | Path to the file containing the engagement analysis result |

## Scoring Algorithm

The engagement score is calculated using configurable weights for various factors:

### Scoring Factors

- **Comments** - Number of comments on the issue
- **Reactions** - Total reactions (👍, 🎉, ❤️, etc.)
- **Contributors** - Number of unique contributors
- **Time Factors** - Days since last activity and issue age
- **Pull Requests** - Number of linked pull requests

### Default Formula

```txt
Score = (Comments × 3) + (Reactions × 1) + (Contributors × 2) +
        (Time Factors × 1) + (Pull Requests × 2)
```

Weights can be customized using a [configuration file](configuration.md).

## Score Interpretation

- **High Scores (>50)** - Issues with significant community engagement requiring immediate attention
- **Medium Scores (10-50)** - Issues with moderate activity that have potential for growth
- **Low Scores (<10)** - Issues with limited engagement that may need promotion or closure
- **Historic Comparison** - Shows activity trends by comparing with previous week scores

## Required Permissions

### For Project Updates

```yaml
permissions:
  contents: read # To read repository content
  issues: read # To read issue data for scoring
  pull-requests: read # To read PR data for scoring
```

### For Issue Analysis Only

```yaml
permissions:
  contents: read # To read repository content
  issues: read # To read issue data for scoring
  pull-requests: read # To read PR data for scoring
```

**Note**: For project operations, you need a token with project access permissions. Use a custom token with appropriate
project permissions:

```yaml
- uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    token: ${{ secrets.PROJECT_TOKEN }} # Token with project access
    project: 123
```

## Examples

### Weekly Engagement Review

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

jobs:
  engagement-scoring:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement scores for project
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          token: ${{ secrets.PROJECT_TOKEN }} # Custom token with project access
          project: 1 # Replace with your project number
          apply-scores: true
          project-column: 'Engagement Score'
          dry-run: false
```

### Issue-Triggered Scoring

```yaml
name: 'Score New Issues'

on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: read
  pull-requests: read

jobs:
  score-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement score for new issue
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          token: ${{ secrets.PROJECT_TOKEN }} # Custom token with project access
          issue: ${{ github.event.issue.number }}
          apply-scores: true
          project: 1 # Your project number
```

### Combined Workflow

```yaml
name: 'Complete Issue Triage'

on:
  issues:
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
      # Step 1: Apply AI-powered labels
      - name: Apply area labels
        uses: mattleibow/triage-assistant/apply-labels@v0.7.0
        with:
          template: multi-label
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true

      # Step 2: Calculate engagement score
      - name: Calculate engagement score
        uses: mattleibow/triage-assistant/engagement-score@v0.7.0
        with:
          issue: ${{ github.event.issue.number }}
          apply-scores: true
          project: 1 # Your project number
          project-column: 'Engagement Score'
```

## Project Integration

### Setting Up GitHub Projects v2

1. Create a new GitHub Project in your repository or organization
2. Add a custom field for engagement scores:
   - Field name: `Engagement Score` (or customize with `project-column`)
   - Field type: Number
3. Add issues to your project
4. Run the engagement scoring workflow

### Project Field Updates

The action will:

- Find the specified project field by name
- Update each project item with its calculated engagement score
- Handle items from multiple repositories within the same project
- Skip items that aren't issues (like draft cards)

## Historic Analysis

The system calculates both current and historic scores:

- **Current Score**: Based on all activity up to now
- **Previous Score**: Based on activity from 7 days ago
- **Trend Analysis**: Identifies "Hot" issues with increasing engagement

This enables tracking engagement momentum over time.

## Customization

Engagement scoring behavior can be customized using a [configuration file](configuration.md):

```yaml
# .triagerc.yml
engagement:
  weights:
    comments: 4 # Emphasize discussion volume
    reactions: 2 # Give more weight to sentiment
    contributors: 3 # Prioritize diverse participation
    lastActivity: 1 # Standard recency weighting
    issueAge: 1 # Standard age weighting
    linkedPullRequests: 5 # Heavily prioritize active development
```

## Workflow Tips

- **Start with dry-run**: Use `dry-run: true` to test scoring without making changes
- **Review field names**: Ensure `project-column` matches your project field exactly
- **Monitor rate limits**: Large projects may hit GitHub API rate limits
- **Use scheduling**: Run periodic scoring updates for best results

## See Also

- [Configuration](configuration.md) - Customizing scoring weights
- [Apply Labels Action](apply-labels.md) - AI-powered label application
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
