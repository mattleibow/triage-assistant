---
title: Configuration
description: Complete guide to configuring AI Triage Assistant
---

# Configuration

AI Triage Assistant supports extensive configuration options to customize its behavior for your specific needs.

## Input Parameters

### Core Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `mode` | Operation mode: `apply-labels`, `engagement-score` | No | `apply-labels` |
| `token` | GitHub token for API access | No | `${{ github.token }}` |
| `ai-token` | Token for AI inference | No | Same as `token` |

### AI Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `ai-endpoint` | Endpoint for AI inference | No | Default endpoint |
| `ai-model` | Model to use for AI inference | No | Default model |

### Issue Selection

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `issue` | Specific issue number to triage | No | Current issue |
| `issue-query` | GitHub search query for bulk operations | No | - |

### Actions

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `apply-labels` | Whether to apply labels to issues | No | `false` |
| `apply-comment` | Whether to comment on issues | No | `false` |
| `dry-run` | Run without making changes | No | `false` |

### Engagement Scoring

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `project` | Project number for engagement scoring | No | - |
| `project-column` | Column name for scores | No | `Engagement Score` |
| `apply-scores` | Whether to update project scores | No | `false` |

## Configuration File

You can also configure the action using a YAML file in your repository:

**`.triagerc.yml`** or **`.github/.triagerc.yml`**:

```yaml
engagement:
  weights:
    comments: 3
    reactions: 1
    contributors: 2
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
```

## Environment Variables

The action also supports configuration via environment variables:

- `TRIAGE_GITHUB_TOKEN` - GitHub token
- `TRIAGE_AI_TOKEN` - AI API token
- `TRIAGE_AI_ENDPOINT` - AI endpoint URL
- `TRIAGE_AI_MODEL` - AI model name