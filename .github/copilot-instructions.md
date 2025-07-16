# GitHub Copilot Instructions for AI Triage Assistant

## Project Overview

This is a TypeScript GitHub Action that provides AI-powered triage for issues and pull requests. The action analyzes
issue/PR content using large language models (LLMs) to automatically apply appropriate labels and comments.

## Architecture and Key Components

### Core Structure

- **`src/main.ts`** - Entry point that orchestrates the triage process
- **`src/triage-config.ts`** - Configuration interface and input parsing
- **`src/select-labels.ts`** - Core triage logic and LLM interaction
- **`src/apply.ts`** - GitHub API interactions for applying labels/comments
- **`src/ai.ts`** - AI model client abstraction
- **`src/issues.ts`** - Issue data retrieval and formatting
- **`src/prompts/`** - AI prompt templates organized by functionality
- **`src/engagement.ts`** - Engagement scoring algorithm and project management
- **`src/engagement-types.ts`** - Type definitions for engagement scoring

### Prompt Engineering Architecture

The action uses a two-tier prompt system:

- **System prompts** (`src/prompts/select-labels/system-prompt-*.ts`) - Define AI behavior for different triage
  templates
- **User prompts** (`src/prompts/select-labels/user-prompt.ts`) - Format issue content for analysis
- **Templates**: `single-label`, `multi-label`, `regression`, `missing-info`, `engagement-score`

### Engagement Scoring Architecture

The action includes an advanced engagement scoring system that calculates numerical scores for issues based on community
activity:

- **Dual Mode Operation** - The action operates in two modes: traditional AI triage or engagement scoring
- **Scoring Algorithm** - Uses weighted factors: Comments (3x), Reactions (1x), Contributors (2x), Time factors (1x),
  PRs (2x)
- **Historic Comparison** - Calculates previous week scores for trend analysis
- **Project Integration** - Updates GitHub Project fields with calculated scores using GraphQL API
- **Single Issue Mode** - Can score individual issues or entire project backlogs

## Development Patterns

### TypeScript Configuration

- Uses ES modules (`"type": "module"` in package.json)
- Strict TypeScript configuration with multiple tsconfig files
- Import paths use `.js` extensions for ES module compatibility

### Error Handling

- Comprehensive try-catch blocks with GitHub Actions core logging
- Graceful degradation when AI services are unavailable
- Detailed error messages for debugging

### Testing Strategy

- Jest with ES modules support
- Test files in `__tests__/` directory
- Fixtures in `__fixtures__/` for mock data
- Coverage reporting with badge generation

### Build and Distribution

- Rollup for bundling TypeScript to single `dist/index.js`
- GitHub Actions expects Node.js entry point in `dist/`
- `npm run bundle` combines formatting, linting, testing, and packaging

## Key Conventions

### Code Style

- Prettier for formatting with `.prettierrc.yml`
- ESLint with TypeScript support
- Consistent naming: kebab-case for files, camelCase for variables
- Explicit return types for public functions

### Environment Variables

- `TRIAGE_AI_ENDPOINT` - Override default AI endpoint
- `TRIAGE_AI_MODEL` - Override default AI model
- `GITHUB_TOKEN` - GitHub API authentication (from action context)

### Input/Output Patterns

- Action inputs defined in `action.yml`
- Boolean inputs use `core.getBooleanInput()`
- Optional inputs with sensible defaults
- File outputs for response data

## Common Development Tasks

### Adding New Triage Templates

1. Create system prompt in `src/prompts/select-labels/system-prompt-{template}.ts`
2. Export from `src/prompts/select-labels/index.ts`
3. Update template validation in `src/select-labels.ts`
4. Add tests in `__tests__/`

### Adding New Engagement Scoring Features

1. Update types in `src/engagement-types.ts`
2. Modify scoring algorithm in `src/engagement.ts`
3. Update configuration in `src/triage-config.ts`
4. Add comprehensive tests in `__tests__/engagement.test.ts`
5. Update action inputs in `action.yml`

### Modifying AI Behavior

- System prompts control AI behavior and output format
- User prompts format input data (issue title, body, labels)
- JSON schema validation ensures consistent AI responses
- Use `TriageResponse` interface for type safety

### Testing Changes

- Run `npm test` for unit tests
- Use `npm run local-action` for local development testing
- Test with `.env` file for environment variables
- Mock GitHub API responses in tests

### Build Process

- `npm run format:write` - Format code with Prettier
- `npm run lint` - Run ESLint checks
- `npm run package` - Bundle TypeScript for distribution
- `npm run all` - Complete build pipeline

## Integration Points

### GitHub API

- Uses `@actions/github` for repository context
- Requires `issues: write` and `pull-requests: write` permissions
- Manages issue labels and comments through Octokit client
- **GraphQL API** - Uses GitHub's GraphQL API for project field updates and issue retrieval
- **Projects v2** - Integrates with GitHub Projects v2 for engagement score management

### AI Models

- Integrates with GitHub Models API (models.github.ai)
- Uses Azure AI Inference client for model communication
- Supports OpenAI GPT-4 and other compatible models
- Configurable endpoints and models

### Action Inputs

- `template` - Selects triage strategy (single-label, multi-label, etc.)
- `label-prefix` - Filters available labels by prefix
- `apply-labels` - Controls whether to actually apply labels
- `apply-comment` - Controls whether to add AI explanation comments

#### Engagement Scoring Inputs

- `project` - GitHub Project number for engagement scoring
- `project-column` - Project field name to update with scores (default: "Engagement Score")
- `apply-scores` - Controls whether to update project items with calculated scores
- `issue` - Specific issue number for single-issue scoring mode

## Performance Considerations

### Response Caching

- AI responses are written to output files for debugging
- Consider implementing caching for repeated triage requests
- Label filtering reduces AI model input size

### Rate Limiting

- GitHub API has rate limits for label applications
- AI model endpoints may have usage quotas
- Implement retry logic for transient failures

## Security Guidelines

### Token Management

- Never log GitHub tokens or API keys
- Use GitHub's built-in token for API access
- Validate input sanitization for AI prompts

### AI Model Security

- Sanitize issue content before sending to AI models
- Validate AI responses before applying to GitHub
- Use structured output formats to prevent injection

## Debugging and Troubleshooting

### Common Issues

- **AI model timeouts**: Check endpoint availability and model load
- **Permission errors**: Verify GitHub token has required scopes
- **Label application failures**: Ensure labels exist in repository
- **Build failures**: Check TypeScript compilation and dependency versions

### Debug Output

- Enable Actions debug logging with `ACTIONS_STEP_DEBUG=true`
- AI responses are logged for troubleshooting
- Error stack traces include context about failed operations

## Dependencies and Maintenance

### Key Dependencies

- `@actions/core` - GitHub Actions framework
- `@actions/github` - GitHub API client
- `@azure-rest/ai-inference` - AI model communication
- `typescript` - Language and compilation

### Regular Maintenance

- Keep AI models updated as new versions are released
- Monitor GitHub Actions API changes
- Update dependencies for security patches
- Review prompt effectiveness with new AI model versions

## Engagement Scoring System

### Algorithm Overview

The engagement scoring system calculates numerical scores for GitHub issues based on community activity and interaction
patterns. The algorithm uses weighted factors to determine issue importance:

**Scoring Components:**

- **Comments** (Weight: 3) - Number of comments on the issue
- **Reactions** (Weight: 1) - Total reactions (👍, 🎉, ❤️, etc.)
- **Contributors** (Weight: 2) - Number of unique contributors
- **Time Factors** (Weight: 1) - Days since last activity and issue age
- **Pull Requests** (Weight: 2) - Number of linked pull requests

**Historic Comparison:**

- Calculates previous week scores for trend analysis
- Compares current activity to historical patterns
- Provides context for score interpretation

### Usage Modes

**Project-Wide Scoring:**

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    template: engagement-score
    project: 123
    apply-scores: true
    project-column: 'Engagement Score'
```

**Single Issue Scoring:**

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    template: engagement-score
    issue: 456
    apply-scores: false
```

### Configuration Options

- `project` - GitHub Project number for bulk scoring
- `issue` - Specific issue number for single-issue analysis
- `project-column` - Field name in project to update (default: "Engagement Score")
- `apply-scores` - Whether to update project items with calculated scores
- `dry-run` - Run calculations without making changes

### GraphQL Integration

The system uses GitHub's GraphQL API for efficient data retrieval and updates:

- **Project Items** - Retrieves all issues from a project
- **Field Updates** - Updates project fields with calculated scores
- **Issue Data** - Fetches comprehensive issue activity data
- **Error Handling** - Graceful handling of missing fields and permissions

### Score Interpretation

- **High Scores (>50)** - Active issues with significant community engagement
- **Medium Scores (10-50)** - Moderate activity, potential for growth
- **Low Scores (<10)** - Limited engagement, may need attention or closure
- **Historic Trends** - Compare current vs. previous week for activity patterns

## Best Practices for AI Assistance

When working with this codebase:

1. **Understand the prompt system** - Changes to prompts significantly affect AI behavior
2. **Test with real data** - Use actual GitHub issues for testing, not just unit tests
3. **Consider edge cases** - Empty issues, very long content, special characters
4. **Validate AI responses** - Always check that AI output matches expected schema
5. **Monitor performance** - AI calls are the slowest part of the workflow
6. **Keep prompts focused** - Specific, clear prompts yield better results than verbose ones

### Working with Engagement Scoring

When modifying engagement scoring functionality:

1. **Understand the algorithm** - The scoring weights are carefully balanced for meaningful results
2. **Test with real projects** - Use actual GitHub projects with varied issue activity
3. **Consider performance** - GraphQL queries can be expensive for large projects
4. **Validate scoring logic** - Ensure scores correlate with actual community engagement
5. **Handle edge cases** - Empty projects, issues without activity, missing permissions
6. **Monitor API limits** - GitHub GraphQL API has rate limits and complexity costs

## Testing Best Practices

### Always Write Tests

When adding new functionality, always write comprehensive tests:

1. **Test each function individually** - Unit tests for all public functions
2. **Test edge cases** - Empty inputs, null values, boundary conditions
3. **Test common paths** - Normal usage scenarios with typical data
4. **Test error scenarios** - Invalid inputs, API failures, missing data
5. **Test integration** - End-to-end workflows and component interactions

### Test Organization

- Follow existing test patterns in `__tests__/` directory
- Use fixtures in `__fixtures__/` for mock data
- Mock external dependencies (GitHub API, file system)
- Use descriptive test names that explain the scenario
- Group related tests with `describe` blocks

### Test Coverage Areas

**For engagement scoring functions:**
- Score calculation with various issue states
- Historical data processing edge cases
- Project item handling with missing data
- GraphQL query and mutation error scenarios
- Configuration validation and defaults

**For issue processing functions:**
- Date calculations with timezone handling
- Contributor counting with duplicate users
- Reaction processing across issues and comments
- Empty or null data handling
- Large dataset performance

### Mock Strategy

- Use Jest mocks for external APIs
- Create realistic test data that mirrors actual GitHub responses
- Test both success and failure scenarios
- Mock system time for consistent date testing
- Avoid over-mocking - test real logic where possible
