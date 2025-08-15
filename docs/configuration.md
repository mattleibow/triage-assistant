# Configuration

The AI Triage Assistant supports configuration through YAML files for engagement scoring weights and other settings.

## .triagerc.yml Configuration

The engagement scoring weights can be customized using a YAML configuration file. The system looks for configuration
files in this order:

1. `.triagerc.yml` in the repository root
2. `.github/.triagerc.yml` in the .github directory

If no configuration file is found, the system uses sensible defaults.

### Example Configuration

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

### Weight Customization Examples

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

### Default Weights

If no configuration file is provided, the system uses these default weights:

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

### Engagement Scoring Algorithm

The engagement score is calculated using your configured weights:

```
Score = (Comments × comments_weight) + (Reactions × reactions_weight) +
        (Contributors × contributors_weight) + (Time Factors × time_weights) +
        (Pull Requests × pr_weight)
```

#### Scoring Components

- **Comments** - Number of comments on the issue
- **Reactions** - Total reactions (👍, 🎉, ❤️, etc.)
- **Contributors** - Number of unique contributors
- **Time Factors** - Days since last activity and issue age
- **Pull Requests** - Number of linked pull requests (not implemented yet)

The algorithm also calculates a "previous score" based on activity from 7 days ago, allowing for trend analysis and
identification of issues gaining or losing momentum.

### Score Interpretation

- **High Scores (>50)** - Issues with significant community engagement that may need immediate attention
- **Medium Scores (10-50)** - Issues with moderate activity that have potential for growth
- **Low Scores (<10)** - Issues with limited engagement that may need promotion or closure
- **Historic Comparison** - The system also calculates previous week scores to show activity trends
