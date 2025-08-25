---
title: Engagement Scoring
description: Understanding the engagement scoring system
---

# Engagement Scoring

The engagement scoring system provides a mathematical approach to prioritizing issues based on community activity and interest.

## How It Works

The scoring algorithm calculates a weighted score based on several factors:

```
Score = (Comments × comments_weight) + 
        (Reactions × reactions_weight) +
        (Contributors × contributors_weight) + 
        (Time_factors × time_weights) +
        (Pull_requests × pr_weight)
```

## Scoring Factors

### Comments (Default weight: 3)
- Number of comments on the issue
- Indicates discussion volume and complexity

### Reactions (Default weight: 1)  
- Total reactions (👍, 👎, ❤️, 🎉, 😕, 🚀, 👀)
- Shows community sentiment and interest

### Contributors (Default weight: 2)
- Number of unique users who have participated
- Reflects diversity of community input

### Time Factors (Default weight: 1)
- Recent activity within the last 7 days
- Issue age and recency of updates

### Pull Requests (Default weight: 2)
- Number of linked or related pull requests
- Indicates active development work

## Configuration

Customize weights in `.triagerc.yml`:

```yaml
engagement:
  weights:
    comments: 4        # Emphasize discussion
    reactions: 2       # Value community sentiment
    contributors: 3    # Prioritize diverse participation
    lastActivity: 1    # Standard recency weighting
    issueAge: 1        # Standard age weighting
    linkedPullRequests: 5  # Heavily prioritize active development
```

## Usage in GitHub Projects

The engagement score can be automatically updated in GitHub Projects v2:

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    mode: 'engagement-score'
    project: 123
    apply-scores: true
    project-column: 'Engagement Score'
```

This will:
1. Calculate scores for all issues in the project
2. Update the specified column with the calculated scores
3. Enable sorting and filtering by engagement level