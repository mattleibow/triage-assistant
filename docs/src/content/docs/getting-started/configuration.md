---
title: Configuration
description: Comprehensive configuration guide for AI Triage Assistant
---

# Configuration

AI Triage Assistant provides extensive configuration options through workflow inputs and configuration files.

## Workflow Inputs

### Mode Selection

| Input | Description | Default | Options |
|-------|-------------|---------|---------|
| `mode` | Operation mode | `apply-labels` | `apply-labels`, `engagement-score` |

### General Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `token` | GitHub token | `${{ github.token }}` | No |
| `dry-run` | Run without making changes | `false` | No |

### AI Configuration

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `ai-token` | AI service token | `${{ github.token }}` | No |
| `ai-endpoint` | AI service endpoint | GitHub Models | No |
| `ai-model` | AI model to use | `openai/gpt-4o` | No |

### Labeling Mode Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `apply-labels` | Apply AI-suggested labels | `false` | No |
| `apply-comment` | Add AI analysis comment | `false` | No |
| `comment-footer` | Footer text for comments | Default disclaimer | No |
| `issue` | Specific issue number | Current issue | No |
| `issue-query` | GitHub search query for bulk processing | - | No |

### Engagement Scoring Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `project` | GitHub Project number | - | For project scoring |
| `project-column` | Project field name for scores | `Engagement Score` | No |
| `apply-scores` | Update project with scores | `false` | No |

## Configuration Files

### .triagerc.yml

Create `.triagerc.yml` in your repository root or `.github/` directory:

```yaml
# Label configuration
labels:
  groups:
    type:
      description: "Issue type classification"
      template: "multi-label"  # single-label, multi-label, regression, missing-info
      labels:
        - "bug"
        - "feature"
        - "documentation"
        - "question"
        - "enhancement"
    
    priority:
      description: "Priority classification"
      template: "single-label"
      labels:
        - "priority-critical"
        - "priority-high"
        - "priority-medium"
        - "priority-low"

# Engagement scoring configuration
engagement:
  weights:
    comments: 3              # Discussion volume weight
    reactions: 1             # Community reactions weight
    contributors: 2          # Unique contributors weight
    lastActivity: 1          # Recent activity weight
    issueAge: 1              # Issue age factor weight
    linkedPullRequests: 2    # Associated PRs weight
```

### Label Templates

Choose from predefined prompt templates:

- **`multi-label`**: Apply multiple labels from a group
- **`single-label`**: Apply exactly one label from a group
- **`regression`**: Specialized for regression issue detection
- **`missing-info`**: Identify issues needing more information

## Environment Variables

Set environment variables for configuration:

```bash
# GitHub token (fallback)
TRIAGE_GITHUB_TOKEN=ghp_your_token_here

# AI service configuration
TRIAGE_AI_TOKEN=your_ai_token
TRIAGE_AI_ENDPOINT=https://your-ai-endpoint.com
TRIAGE_AI_MODEL=gpt-4o
```

## Advanced Configuration

### Custom AI Endpoints

Configure Azure AI or other AI services:

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    ai-endpoint: 'https://your-azure-ai.cognitiveservices.azure.com'
    ai-model: 'gpt-4o'
    ai-token: ${{ secrets.AZURE_AI_KEY }}
```

### Bulk Processing

Process multiple issues with search queries:

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    mode: 'apply-labels'
    issue-query: 'is:issue is:open label:needs-triage'
    apply-labels: true
```

### Project Integration

Set up engagement scoring for GitHub Projects:

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    mode: 'engagement-score'
    project: 1
    project-column: 'Community Engagement'
    apply-scores: true
```

## Security Considerations

- Use repository secrets for sensitive tokens
- Limit workflow permissions to minimum required
- Review AI model outputs before applying in production
- Use `dry-run: true` for testing configuration changes

## Next Steps

- Learn about [AI-Powered Labeling](../../features/ai-labeling/) features
- Explore [Engagement Scoring](../../features/engagement-scoring/) capabilities
- Check the [Reference documentation](../../reference/) for complete API details