# Troubleshooting

This guide helps you resolve common issues when using the AI Triage Assistant.

## General Issues

### GitHub Token Problems

**Issue**: Permission denied or authentication errors **Solution**:

- Ensure your GitHub token has the necessary permissions
- Check that the token is properly set in your workflow secrets
- Verify the token hasn't expired

### AI Model Issues

**Issue**: AI model errors or unexpected responses **Solution**:

- Check that the AI model you're using is available in GitHub Models
- Verify your AI token is valid and has access to the specified model
- Try switching to a different model (e.g., `openai/gpt-4o-mini`)

### Label Application Problems

**Issue**: Labels not being applied to issues **Solution**:

- Verify that labels exist in your repository before trying to apply them
- Check that `apply-labels: true` is set in your workflow
- Ensure the label prefix matches existing labels in your repository
- Review the AI response file output for detailed analysis information

## Engagement Scoring Issues

### Project Not Found

**Issue**: "Project not found" error **Solution**:

- Ensure the project number is correct
- Verify the token has `projects: write` permission
- Check that the project is accessible with your current token

### Field Not Found

**Issue**: "Field not found" error **Solution**:

- Verify the project field name matches exactly (case-sensitive)
- Ensure the field exists in your GitHub Project
- Check that the field type is compatible with numeric values

### No Issues Found

**Issue**: "No issues found" error **Solution**:

- Check that the project contains issues and they are accessible
- Verify issues are properly linked to the project
- Ensure your token has read access to the issues

### Permission Errors

**Issue**: Permission denied when updating project fields **Solution**:

- Ensure your workflow has `projects: write` permission
- Check that your token has access to the specified project
- Verify the project is in the same organization/repository

## Debugging Tips

### Use Dry Run Mode

Test configurations without making changes:

```yaml
- name: Test configuration
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: multi-label
    dry-run: true
```

### Check Action Logs

Review the action logs for detailed error messages:

1. Go to your workflow run in the Actions tab
2. Click on the failed step
3. Expand the logs to see detailed error messages

### Verify Project Field Names

Ensure project field names are exactly as they appear in your GitHub Project:

1. Go to your GitHub Project
2. Check the exact spelling and capitalization of field names
3. Update your workflow to match exactly

### Test with Manual Trigger

Use workflow dispatch to test specific scenarios:

```yaml
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to test'
        required: true
        type: number
```

### Enable Debug Logging

Add debug information to your workflow:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

## Common Error Messages

### "Rate limit exceeded"

**Cause**: Too many API requests **Solution**:

- Reduce the frequency of your workflow runs
- Use batch processing for multiple issues
- Consider using a personal access token with higher rate limits

### "Resource not accessible by integration"

**Cause**: Insufficient permissions **Solution**:

- Add the required permissions to your workflow
- Check that your token has access to the resource
- Verify the repository/project visibility settings

### "AI model not available"

**Cause**: Specified AI model is not accessible **Solution**:

- Check GitHub Models availability for your account
- Try using a different model
- Verify your AI token has access to the specified model

### "Invalid project number"

**Cause**: Project number is incorrect or doesn't exist **Solution**:

- Verify the project number in your GitHub Project URL
- Ensure the project exists and is accessible
- Check that you're using the project number, not the project name

## Getting Help

If you continue to experience issues:

1. Check the [GitHub Issues](https://github.com/mattleibow/triage-assistant/issues) for similar problems
2. Review the action logs for detailed error information
3. Create a new issue with:
   - Your workflow configuration
   - Error messages from the logs
   - Steps to reproduce the issue
   - Expected vs actual behavior

## Performance Tips

### Optimize Workflow Frequency

- Don't run engagement scoring too frequently (weekly is usually sufficient)
- Use conditions to avoid unnecessary runs
- Consider using manual triggers for testing

### Batch Operations

- Process multiple labels in a single workflow run
- Use project-wide scoring instead of individual issue scoring when possible
- Combine multiple triage operations in a single workflow

### Token Management

- Use repository secrets for tokens
- Consider using app tokens for better rate limits
- Rotate tokens regularly for security
