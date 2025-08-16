# Configuration

The Triage Assistant supports customization through a YAML configuration file that controls engagement scoring weights
and other settings.

## Configuration File Location

The system looks for configuration files in this order:

1. `.triagerc.yml` in the repository root
2. `.github/.triagerc.yml` in the .github directory

If no configuration file is found, the system uses sensible defaults.

## Basic Configuration

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

## Default Weights

If no configuration is provided, these default weights are used:

| Factor               | Default Weight | Description                                  |
| -------------------- | -------------- | -------------------------------------------- |
| `comments`           | 3              | Discussion volume indicates high interest    |
| `reactions`          | 1              | Emotional engagement and community sentiment |
| `contributors`       | 2              | Diversity of input reflects broad interest   |
| `lastActivity`       | 1              | Recent activity indicates current relevance  |
| `issueAge`           | 1              | Issue age for prioritization                 |
| `linkedPullRequests` | 2              | Active development work                      |

## Configuration Examples

### Emphasize Discussion Volume

For projects where highly discussed issues should be prioritized:

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

### Focus on Active Development

For projects where issues with active PRs should be prioritized:

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

### Prioritize Community Engagement

For projects where community sentiment is most important:

```yaml
engagement:
  weights:
    reactions: 4
    contributors: 4
    comments: 2
    lastActivity: 2
    issueAge: 1
    linkedPullRequests: 1
```

## Configuration Validation

- All weights must be positive numbers
- Missing weights will use default values
- Invalid YAML will cause the system to fall back to defaults
- Configuration loading errors are logged but don't stop execution

## Algorithm Details

The engagement score is calculated using the configured weights:

```txt
Score = (Comments × comments_weight) + (Reactions × reactions_weight) +
        (Contributors × contributors_weight) + (Time Factors × time_weights) +
        (Pull Requests × pr_weight)
```

The algorithm also calculates a "previous score" based on activity from 7 days ago, allowing for trend analysis and
identification of issues gaining or losing momentum.

## See Also

- [Engagement Score Action](engagement-score.md) - How to use engagement scoring
- [Apply Labels Action](apply-labels.md) - AI-powered label application
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
