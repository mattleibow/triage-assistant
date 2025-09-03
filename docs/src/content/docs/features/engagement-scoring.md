---
title: Engagement Scoring
description: Calculate and track issue engagement for intelligent prioritization
---

The engagement scoring system provides mathematical analysis of community engagement to help prioritize issues based on
actual activity and interest levels.

## How Engagement Scoring Works

The system calculates scores using a configurable weighted algorithm:

```
Score = (Comments × comments_weight) + (Reactions × reactions_weight) +
        (Contributors × contributors_weight) + (TimeFactors × time_weights) +
        (PullRequests × pr_weight)
```

### Scoring Components

- **Comments**: Discussion volume indicates high interest and complexity
- **Reactions**: Emotional engagement and community sentiment
- **Contributors**: Diversity of input reflects broad community interest
- **Time Factors**: Recent activity and issue age for relevance
- **Pull Requests**: Active development work on the issue

## Configuration

### Default Weights

```yaml
engagement:
  weights:
    comments: 3 # Discussion volume
    reactions: 1 # Community reactions
    contributors: 2 # Unique contributors
    lastActivity: 1 # Recent activity
    issueAge: 1 # Issue age factor
    linkedPullRequests: 2 # Associated PRs
```

### Custom Weight Configuration

Create `.triagerc.yml` to customize scoring:

```yaml
engagement:
  weights:
    comments: 4 # Emphasize discussion
    reactions: 2 # Increase reaction weight
    contributors: 3 # Prioritize diverse input
    lastActivity: 1 # Standard recency weight
    issueAge: 1 # Standard age weight
    linkedPullRequests: 5 # Heavily prioritize active development
```

## Usage Modes

### Project-Wide Scoring

Calculate engagement scores for all issues in a GitHub Project:

```yaml
name: 'Engagement Scoring'

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
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
      - uses: actions/checkout@v5
      - uses: mattleibow/triage-assistant/engagement-score@v1
        with:
          token: ${{ secrets.ENGAGEMENT_GITHUB_TOKEN }}
          project: 8 # Your project number
          apply-scores: true
          project-column: 'Engagement Score'
```

### Single Issue Analysis

Calculate engagement score for a specific issue:

```yaml
- uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    issue: 123 # Specific issue number
    apply-scores: false # Just calculate, don't update
```

### Action Usage

Use the focused engagement-score action:

```yaml
- uses: mattleibow/triage-assistant/engagement-score@v1
  with:
    project: 8
    apply-scores: true
    project-column: 'Community Engagement'
```

## GitHub Projects Integration

### Project Setup

1. **Create a Project**: Set up a GitHub Project v2
2. **Add Number Field**: Create a number field for engagement scores
3. **Add Issues**: Add issues to your project
4. **Configure Workflow**: Set up the engagement scoring workflow

### Field Configuration

The action can update any number field in your project:

```yaml
with:
  project-column: 'Engagement Score'    # Default field name
  # OR
  project-column: 'Community Interest'  # Custom field name
  # OR
  project-column: 'Priority Score'      # Alternative naming
```

### Project Permissions

Ensure your workflow has the necessary permissions:

```yaml
permissions:
  contents: read
  issues: read
  pull-requests: read
  repository-projects: write # Required for updating project fields
```

## Historic Analysis

### 7-Day Lookback

The system calculates trend analysis by comparing current scores with previous week:

- **Current Score**: Based on all-time activity
- **Historic Score**: Activity from 7 days ago
- **Trend Classification**: Identifies "Hot" issues with increasing engagement

### Trend Indicators

Issues are classified based on engagement trends:

- **🔥 Hot**: Significantly increasing engagement
- **📈 Rising**: Moderate increase in engagement
- **📉 Declining**: Decreasing engagement
- **➡️ Stable**: Consistent engagement levels

## Data Sources

### Comment Analysis

- Total comment count
- Recent comment activity
- Comment author diversity
- Comment reaction engagement

### Reaction Metrics

- All reaction types (👍, ❤️, 🎉, etc.)
- Reaction recency
- Reaction author diversity
- Sentiment indicators

### Contributor Tracking

- Unique contributors across all activity
- Contributor role analysis (maintainers vs. community)
- New vs. returning contributors

### Pull Request Integration

- Linked pull requests
- PR status (open, merged, closed)
- PR activity levels
- Development momentum

## Use Cases

### Issue Prioritization

Use engagement scores to identify:

- **High-impact issues** with broad community interest
- **Trending problems** gaining momentum
- **Stale issues** with declining engagement
- **Community favorites** with sustained interest

### Project Planning

Incorporate engagement data into:

- Sprint planning decisions
- Feature prioritization
- Resource allocation
- Community feedback analysis

### Community Management

Identify:

- Issues needing maintainer attention
- Community-driven initiatives
- Popular feature requests
- Support bottlenecks

## Best Practices

### Scoring Configuration

- **Regular Review**: Adjust weights based on your project's patterns
- **Test Changes**: Use dry-run mode when modifying weights
- **Document Decisions**: Keep configuration changes in version control
- **Monitor Results**: Track score accuracy and usefulness over time

### Project Integration

- **Clear Field Names**: Use descriptive field names in projects
- **Regular Updates**: Run scoring weekly or bi-weekly
- **Combine with Labels**: Use alongside AI labeling for complete triage
- **Team Training**: Ensure team understands scoring methodology

## Troubleshooting

### Common Issues

**Scores not updating**: Check project permissions and field names

**Low score variance**: Adjust weights to better differentiate issues

**Historical analysis fails**: Verify date filtering and API access

**Rate limiting**: Reduce frequency of project-wide scoring

### Debugging

Enable detailed logging:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

Test with specific issues first:

```yaml
with:
  issue: 123
  apply-scores: false # Test without making changes
```

## Next Steps

- Learn about [AI-Powered Labeling](../ai-labeling/) for complete triage
- Explore [Actions](../actions/) for focused workflows
- Check the [Configuration guide](../../getting-started/configuration/) for advanced setup
