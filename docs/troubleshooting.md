# Troubleshooting

Common issues and solutions for the AI Triage Assistant.

## General Issues

### Token and Authentication Problems

**Problem**: `Error: Request failed with status code 401`

**Solutions**:
- Ensure your GitHub token has the necessary permissions
- Check that `GITHUB_TOKEN` is properly configured in your workflow
- Verify the token isn't expired (especially for fine-grained tokens)

**Required permissions**:
```yaml
permissions:
  contents: read
  issues: write # For apply-labels
  pull-requests: write # For apply-labels  
  repository-projects: write # For engagement scoring
  models: read # For AI inference
```

### AI Model Issues

**Problem**: `Error: Model not found` or `Error: Insufficient quota`

**Solutions**:
- Check that the AI model you're using is available in GitHub Models
- Verify your quota limits for the specific model
- Try switching to a different model (e.g., `openai/gpt-4o-mini` instead of `openai/gpt-4o`)

**Example fix**:
```yaml
- uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    ai-model: 'openai/gpt-4o-mini' # More cost-effective option
    template: 'single-label'
```

### Label Application Issues

**Problem**: Labels not being applied to issues

**Solutions**:
- Verify labels exist in your repository before trying to apply them
- Ensure `apply-labels: true` is set when you want labels applied
- Check that your workflow has `issues: write` permission
- Review the AI response file output for detailed analysis information

**Debug workflow**:
```yaml
- name: Debug label application
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'
    label-prefix: 'area-'
    dry-run: true # Test without making changes
    
- name: Check AI response
  run: |
    echo "AI Response:"
    cat ${{ steps.debug.outputs.response-file }}
```

## Engagement Scoring Issues

### Project Not Found

**Problem**: `Error: Project not found` or `Error: Could not determine project ID`

**Solutions**:
- Ensure the project number is correct (check the project URL)
- Verify your token has `repository-projects: write` permission
- Make sure the project is associated with the repository or organization
- For organization projects, ensure your token has organization access

**Finding project number**:
- The project number is in the URL: `https://github.com/users/username/projects/123` → project number is `123`

### Project Field Not Found

**Problem**: `Error: Field 'Engagement Score' not found in project`

**Solutions**:
- Verify the project field name matches exactly (case-sensitive)
- Create the field in your GitHub Project if it doesn't exist
- Use the correct field name in your workflow configuration

**Create field in GitHub Projects**:
1. Go to your project
2. Click the "+" to add a field
3. Choose "Number" as the field type
4. Name it exactly as specified in your workflow (default: "Engagement Score")

### No Issues Found

**Problem**: `Warning: No project items found or unable to determine project ID`

**Solutions**:
- Check that the project contains issues (not just draft cards)
- Ensure issues are accessible with your current permissions
- Verify that the project has items added to it

### Permission Errors

**Problem**: `Error: Resource not accessible by integration`

**Solutions**:
- Ensure your workflow has `repository-projects: write` permission for project updates
- For organization projects, verify the token has appropriate organization permissions
- Check that the project visibility allows access from your workflow

## Configuration Issues

### Configuration File Not Loading

**Problem**: Configuration from `.triagerc.yml` not being applied

**Solutions**:
- Verify the YAML syntax is correct
- Check the file is in the repository root or `.github/` directory
- Ensure the file is committed to the repository
- Review the action logs for configuration loading messages

**Test configuration**:
```bash
# Validate YAML syntax
yamllint .triagerc.yml

# Check file location
ls -la .triagerc.yml
ls -la .github/.triagerc.yml
```

### Invalid Weight Values

**Problem**: Configuration errors with weight values

**Solutions**:
- Ensure all weights are positive numbers
- Use integer or decimal values (e.g., `1`, `2.5`, not `"1"`)
- Missing weights will use default values automatically

**Valid configuration example**:
```yaml
engagement:
  weights:
    comments: 3        # ✓ Valid
    reactions: 2.5     # ✓ Valid  
    contributors: 0    # ✓ Valid (zero weight)
    # missing weights use defaults ✓
```

## Rate Limiting Issues

### GitHub API Rate Limits

**Problem**: `Error: API rate limit exceeded`

**Solutions**:
- Reduce the frequency of workflow runs
- Use smaller page sizes for large projects
- Implement retry logic with exponential backoff
- Consider upgrading to GitHub Enterprise for higher limits

**Optimize for rate limits**:
```yaml
- name: Score large project
  uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 1
    apply-scores: true
  # Run less frequently for large projects
```

### GraphQL Complexity Limits

**Problem**: `Error: Query complexity too high`

**Solutions**:
- The action automatically handles pagination to stay within limits
- For very large projects, consider scoring in batches
- Monitor the action logs for complexity warnings

## Debugging Tips

### Enable Debug Logging

Add to your workflow to get detailed logs:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

### Use Dry-Run Mode

Test configurations without making changes:

```yaml
- uses: mattleibow/triage-assistant/engagement-score@v0.7.0
  with:
    project: 1
    dry-run: true # No changes will be made
```

### Check Response Files

Review AI analysis results:

```yaml
- name: Triage issue
  id: triage
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'

- name: Show AI response
  run: cat ${{ steps.triage.outputs.response-file }}
```

### Verify Project Field Names

List all project fields to find the correct name:

```bash
# Use GitHub CLI to list project fields
gh project field-list 123 # Replace 123 with your project number
```

## Common Workflow Patterns

### Gradual Rollout

Start with dry-run mode, then enable specific features:

```yaml
# Phase 1: Test with dry-run
- uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'
    dry-run: true

# Phase 2: Apply labels only  
- uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'
    apply-labels: true

# Phase 3: Add comments
- uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'
    apply-labels: true
    apply-comment: true
```

### Error Handling

Add error handling to workflows:

```yaml
- name: Triage with error handling
  uses: mattleibow/triage-assistant/apply-labels@v0.7.0
  with:
    template: 'single-label'
    apply-labels: true
  continue-on-error: true # Don't fail the entire workflow
  
- name: Handle errors
  if: failure()
  run: echo "Triage failed, but workflow continues"
```

## Getting Help

If you continue to experience issues:

1. **Check the action logs** for detailed error messages
2. **Review the response files** for AI analysis details
3. **Enable debug logging** with `ACTIONS_STEP_DEBUG: true`
4. **Test with dry-run mode** to isolate issues
5. **Verify permissions** match the requirements for each feature
6. **Check GitHub status** at https://www.githubstatus.com/ for service issues

## See Also

- [Configuration](configuration.md) - Customizing behavior
- [Apply Labels Action](apply-labels.md) - AI-powered label application
- [Engagement Score Action](engagement-score.md) - Community engagement scoring