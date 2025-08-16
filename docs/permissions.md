# Permissions

The AI Triage Assistant requires different permissions depending on the features used.

## Basic Triage Permissions

For AI-powered label application and commenting:

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  models: read # To access GitHub Models for AI inference
```

## Engagement Scoring Permissions

For calculating and applying engagement scores:

```yaml
permissions:
  contents: read # To read repository content
  issues: read # To read issue data for scoring
  pull-requests: read # To read PR data for scoring
  projects: write # To update project fields with scores
  models: read # To access GitHub Models (if AI features are used)
```

## Combined Permissions

For workflows that use both triage and engagement scoring:

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  projects: write # To update project fields with scores
  models: read # To access GitHub Models for AI inference
```

## Permission Details

### `contents: read`

**Required for**: All operations **Purpose**:

- Reading repository files
- Accessing configuration files (`.triagerc.yml`)
- Reading issue and PR content

### `issues: write`

**Required for**: Label application, commenting on issues **Purpose**:

- Adding labels to issues
- Creating comments on issues
- Updating issue metadata

### `pull-requests: write`

**Required for**: Label application, commenting on PRs **Purpose**:

- Adding labels to pull requests
- Creating comments on pull requests
- Updating PR metadata

### `projects: write`

**Required for**: Engagement scoring with project updates

**Purpose**: This permission allows the action to interact with GitHub Projects v2 (the new Projects experience). It enables:

- Reading project structure, fields, and items
- Updating project field values (such as engagement scores)  
- Managing project item properties and metadata
- Accessing project data through the GitHub GraphQL API

**Note**: This permission is specifically for GitHub Projects v2, not the deprecated Projects Classic. The action uses GraphQL queries like `projectV2` and mutations like `updateProjectV2ItemFieldValue` to modify project data.

### `models: read`

**Required for**: AI-powered features **Purpose**:

- Accessing GitHub Models API
- Making AI inference requests
- Using language models for analysis

## Token Requirements

### GitHub Token

The action requires a GitHub token with appropriate permissions. You can use:

1. **Default token**: `${{ github.token }}` (automatically provided)
2. **Custom token**: Stored in repository secrets

### Default Token Limitations

The default `github.token` has limitations:

- Cannot update projects in different repositories
- May have restricted access to certain resources
- Limited to the current repository scope

### Custom Token Benefits

A custom personal access token (PAT) or app token can:

- Access multiple repositories
- Have broader project permissions
- Provide higher rate limits
- Work across organization boundaries

## Token Setup

### Using Default Token

```yaml
- name: Triage with default token
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    # Uses default github.token automatically
    template: multi-label
    apply-labels: true
```

### Using Custom Token

```yaml
- name: Triage with custom token
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
    template: multi-label
    apply-labels: true
```

### Fallback Token

You can specify a fallback token for additional reliability:

```yaml
- name: Triage with fallback
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
    fallback-token: ${{ github.token }}
    template: multi-label
    apply-labels: true
```

## Security Best Practices

### Token Storage

1. **Never hardcode tokens** in workflow files
2. **Use repository secrets** for custom tokens
3. **Rotate tokens regularly** for security
4. **Use least-privilege** tokens when possible

### Permission Scope

1. **Grant minimum required permissions** only
2. **Review permissions** before adding to workflows
3. **Test with dry-run** to verify access without making changes
4. **Monitor token usage** in audit logs

### Organization Considerations

For organization repositories:

1. **Check organization policies** for token requirements
2. **Ensure app permissions** are properly configured
3. **Consider using GitHub Apps** for better security
4. **Review cross-repository access** requirements

## Common Permission Issues

### "Resource not accessible by integration"

**Cause**: Insufficient permissions **Solutions**:

- Add required permissions to workflow
- Use a token with broader scope
- Check repository/organization settings

### "Project not found"

**Cause**: Project access permissions **Solutions**:

- Verify `projects: write` permission
- Ensure token has access to the project
- Check project visibility settings

### "Labels cannot be applied"

**Cause**: Write permissions missing **Solutions**:

- Add `issues: write` and `pull-requests: write`
- Verify token has repository access
- Check if repository allows external contributions

## Testing Permissions

### Dry Run Testing

Test permissions without making changes:

```yaml
- name: Test permissions
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: multi-label
    apply-labels: true
    dry-run: true
```

### Minimal Permission Testing

Start with minimal permissions and add as needed:

```yaml
permissions:
  contents: read
# Add more permissions as required
```

### Permission Validation

The action will report specific permission errors in the logs, helping you identify exactly what permissions are
missing.
