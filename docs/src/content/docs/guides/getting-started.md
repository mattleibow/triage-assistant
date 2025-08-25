---
title: Getting Started
description: Learn how to set up AI Triage Assistant in your GitHub repository
---

# Getting Started

This guide will help you set up AI Triage Assistant in your GitHub repository for automatic issue and pull request triage.

## Prerequisites

- A GitHub repository where you want to enable automatic triage
- An AI API token (for AI-powered labeling features)
- Appropriate permissions for the GitHub token

## Basic Setup

### 1. Create a Workflow File

Create `.github/workflows/triage.yml` in your repository:

```yaml
name: 'AI Triage'
on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, edited]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Triage with AI
        uses: mattleibow/triage-assistant@v1
        with:
          mode: 'apply-labels'
          apply-labels: true
          apply-comment: true
          ai-token: ${{ secrets.AI_TOKEN }}
```

### 2. Configure Secrets

Add your AI API token to your repository secrets:

1. Go to your repository Settings
2. Navigate to Secrets and variables → Actions
3. Add a new secret named `AI_TOKEN` with your API token

### 3. Test the Setup

Create a new issue in your repository to test the automatic triage functionality.

## Next Steps

- [Learn about configuration options](/guides/configuration/)
- [Explore usage examples](/guides/examples/)
- [Set up engagement scoring](/reference/engagement-scoring/)