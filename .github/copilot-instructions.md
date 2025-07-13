# GitHub Copilot Instructions for AI Triage Assistant

## Project Overview

This is a TypeScript GitHub Action that provides AI-powered triage for issues and pull requests. The action operates in
two distinct modes:

1. **Label/Comment Triage Mode** - Analyzes issue/PR content using large language models (LLMs) to automatically apply
   appropriate labels and comments
2. **Engagement Scoring Mode** - Calculates engagement scores for GitHub issues and optionally updates project fields

## Dual Mode Architecture

The action's behavior is controlled by the `template` input parameter:

### Label/Comment Triage Mode

- **Trigger**: When `template` is one of: `single-label`, `multi-label`, `regression`, `missing-info`
- **Requirements**: Issue number is required (defaults to current GitHub issue context)
- **Functions**: AI-powered label selection, comment generation, reaction management
- **Outputs**: AI triage response file with selected labels and reasoning

### Engagement Scoring Mode

- **Trigger**: When `template` is `engagement-score`
- **Requirements**: Project number is required, issue number should not be defaulted
- **Functions**: Calculates engagement scores based on issue activity metrics
- **Outputs**: Engagement response file with calculated scores for issues

## Architecture and Key Components

### Core Structure

- **`src/main.ts`** - Entry point with dual mode orchestration logic and input validation
- **`src/triage-config.ts`** - Configuration interface and input parsing
- **`src/select-labels.ts`** - Core triage logic, LLM interaction, and complete triage workflow (label mode only)
- **`src/apply.ts`** - GitHub API interactions for applying labels/comments (label mode only)
- **`src/engagement.ts`** - Engagement scoring logic, GitHub API integration, and complete engagement workflow (scoring mode only)
- **`src/engagement-types.ts`** - TypeScript interfaces for engagement data structures
- **`src/ai.ts`** - AI model client abstraction
- **`src/issues.ts`** - Issue data retrieval and formatting
- **`src/prompts/`** - AI prompt templates organized by functionality

### Workflow Architecture

The action follows a clean separation of concerns with dedicated workflow functions:

#### Label/Comment Triage Mode
- **`main.ts`**: Validates inputs, creates configuration, calls `runTriageWorkflow`
- **`select-labels.ts`**: Contains `runTriageWorkflow` function that:
  - Manages reaction lifecycle (add/remove eyes reaction)
  - Calls `selectLabels` for AI label selection
  - Calls `applyLabelsAndComment` for GitHub API operations
  - Handles error states and cleanup

#### Engagement Scoring Mode
- **`main.ts`**: Validates inputs, creates configuration, calls `runEngagementWorkflow`
- **`engagement.ts`**: Contains `runEngagementWorkflow` function that:
  - Calls `calculateEngagementScores` for score computation
  - Calls `updateProjectWithScores` for project updates
  - Manages engagement response file creation

### Prompt Engineering Architecture (Label Mode Only)

The action uses a two-tier prompt system for label/comment triage:

- **System prompts** (`src/prompts/select-labels/system-prompt-*.ts`) - Define AI behavior for different triage
  templates
- **User prompts** (`src/prompts/select-labels/user-prompt.ts`) - Format issue content for analysis
- **Templates**: `single-label`, `multi-label`, `regression`, `missing-info`

### Engagement Scoring Architecture (Scoring Mode Only)

- **Algorithm**: Multi-factor scoring based on comments, reactions, contributors, recency, age, and linked PRs
- **Weights**: Comments (3), Reactions (1), Contributors (2), Recency (1), Age (1), Linked PRs (2)
- **Duplicate Handling**: Uses Set to ensure unique contributor counting
- **Classification**: Issues with increasing scores are marked as "Hot"
- **Project Integration**: Full GraphQL API integration for GitHub Projects v2 with comprehensive error handling
- **Fallback**: Graceful degradation to logging when GraphQL operations fail

## Development Patterns

### TypeScript Configuration

- Uses ES modules (`"type": "module"` in package.json)
- Strict TypeScript configuration with multiple tsconfig files
- Import paths use `.js` extensions for ES module compatibility

### Error Handling

- Comprehensive try-catch blocks with GitHub Actions core logging
- Graceful degradation when AI services are unavailable (label mode)
- Graceful degradation when GitHub API calls fail (both modes)
- Detailed error messages for debugging

### Testing Strategy

- Jest with ES modules support
- Test files in `__tests__/` directory with comprehensive test coverage
- Fixtures in `__fixtures__/` for mock data
- Tests must cover both modes and their specific functionality
- Mock GitHub API responses in tests
- Coverage reporting with badge generation
- **Comprehensive workflow testing**: Tests for main.ts, select-labels.ts workflow, and engagement.ts workflow
- **Real scenario testing**: Tests cover actual scoring algorithms, duplicate handling, and error conditions
- **Integration testing**: Tests verify proper interaction between components

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
- Mode-specific input validation

## Mode-Specific Input Requirements

### Label/Comment Triage Mode Requirements

- `template`: One of `single-label`, `multi-label`, `regression`, `missing-info`
- `issue`: Defaults to current GitHub issue if not specified (with null safety)
- `apply-labels`: Controls whether to actually apply labels
- `apply-comment`: Controls whether to add AI explanation comments

### Engagement Scoring Mode Requirements

- `template`: Must be `engagement-score`
- `project`: Required - specifies which project to analyze
- `issue`: Should NOT be defaulted - only used if explicitly provided for filtering
- `apply-scores`: Controls whether to update project items with scores

## Input Validation Logic

The action implements strict validation:

```typescript
if (isEngagementMode) {
  if (!project) {
    throw new Error('Project is required when using engagement-score template')
  }
  issueNumberStr = issue // Don't default to current issue
} else {
  // For label/comment mode, default to current issue if available
  if (issue) {
    issueNumberStr = issue
  } else if (github.context.issue && github.context.issue.number) {
    issueNumberStr = github.context.issue.number.toString()
  }
  
  if (!issueNumberStr) {
    throw new Error('Issue number is required for label/comment triage mode')
  }
}
```

## Common Development Tasks

### Adding New Triage Templates (Label Mode)

1. Create system prompt in `src/prompts/select-labels/system-prompt-{template}.ts`
2. Export from `src/prompts/select-labels/index.ts`
3. Update template validation in `src/select-labels.ts`
4. Add comprehensive tests in `__tests__/` covering the new workflow

### Modifying AI Behavior (Label Mode)

- System prompts control AI behavior and output format
- User prompts format input data (issue title, body, labels)
- JSON schema validation ensures consistent AI responses
- Use `TriageResponse` interface for type safety

### Modifying Engagement Scoring (Scoring Mode)

- Adjust weights in `calculateScore` function in `src/engagement.ts`
- Modify classification logic in engagement calculation
- Update project field integration logic with GraphQL mutations
- Add tests for new scoring behavior with realistic scenarios
- Test duplicate handling and edge cases

### Testing Changes

- Run `npm test` for unit tests
- Use `npm run local-action` for local development testing
- Test with `.env` file for environment variables
- Mock GitHub API responses in tests
- **Critical**: Test both modes independently and ensure proper mode detection
- Test error conditions for missing requirements in each mode
- Test workflow functions (`runTriageWorkflow`, `runEngagementWorkflow`)
- Test engagement scoring algorithm with various issue configurations

### Build Process

- `npm run format:write` - Format code with Prettier
- `npm run lint` - Run ESLint checks
- `npm run package` - Bundle TypeScript for distribution
- `npm run all` - Complete build pipeline

## Integration Points

### GitHub API

- Uses `@actions/github` for repository context
- Label mode requires `issues: write` and `pull-requests: write` permissions
- Scoring mode requires `issues: read` and potentially `projects: write` permissions
- Manages issue labels and comments through Octokit client
- Single token used for all GitHub API operations

### AI Models (Label Mode Only)

- Integrates with GitHub Models API (models.github.ai)
- Uses Azure AI Inference client for model communication
- Supports OpenAI GPT-4 and other compatible models
- Configurable endpoints and models

### Action Inputs

#### Common Inputs

- `template` - **Controls operation mode** (label templates vs. `engagement-score`)
- `token` - GitHub token for API access (used for all operations)

#### Label Mode Specific

- `label-prefix` - Filters available labels by prefix
- `apply-labels` - Controls whether to actually apply labels
- `apply-comment` - Controls whether to add AI explanation comments

#### Engagement Mode Specific

- `project` - Project number to analyze (required)
- `project-column` - Column name for score updates
- `apply-scores` - Controls whether to update project items

## Performance Considerations

### Response Caching

- AI responses are written to output files for debugging (label mode)
- Engagement responses are written to output files for analysis (scoring mode)
- Consider implementing caching for repeated triage requests
- Label filtering reduces AI model input size

### Rate Limiting

- GitHub API has rate limits for label applications and issue queries
- AI model endpoints may have usage quotas (label mode only)
- Implement retry logic for transient failures

## Security Guidelines

### Token Management

- Never log GitHub tokens or API keys
- Use GitHub's built-in token for API access
- Single token strategy reduces complexity and attack surface
- Validate input sanitization for AI prompts

### AI Model Security (Label Mode Only)

- Sanitize issue content before sending to AI models
- Validate AI responses before applying to GitHub
- Use structured output formats to prevent injection

## Debugging and Troubleshooting

### Common Issues

#### Label Mode

- **AI model timeouts**: Check endpoint availability and model load
- **Permission errors**: Verify GitHub token has required scopes
- **Label application failures**: Ensure labels exist in repository

#### Engagement Mode

- **Missing project**: Verify project number is correct and accessible
- **API rate limits**: Engagement scoring makes many API calls for issue data
- **Project update failures**: Currently implemented as logging only

#### General

- **Build failures**: Check TypeScript compilation and dependency versions
- **Mode detection errors**: Verify template parameter is set correctly

### Debug Output

- Enable Actions debug logging with `ACTIONS_STEP_DEBUG=true`
- AI responses are logged for troubleshooting (label mode)
- Engagement calculations are logged with detailed metrics
- Error stack traces include context about failed operations

## Dependencies and Maintenance

### Key Dependencies

- `@actions/core` - GitHub Actions framework
- `@actions/github` - GitHub API client
- `@azure-rest/ai-inference` - AI model communication (label mode only)
- `typescript` - Language and compilation

### Regular Maintenance

- Keep AI models updated as new versions are released
- Monitor GitHub Actions API changes
- Update dependencies for security patches
- Review prompt effectiveness with new AI model versions (label mode)
- Monitor engagement scoring algorithm effectiveness (scoring mode)

## Best Practices for AI Assistance

When working with this codebase:

### General

1. **Understand the dual modes** - Always consider which mode your changes affect
2. **Test both modes** - Ensure changes don't break the other mode
3. **Validate mode switching** - Test that template parameter correctly controls behavior
4. **Consider input requirements** - Each mode has different required inputs

### Label Mode Specific

5. **Understand the prompt system** - Changes to prompts significantly affect AI behavior
6. **Test with real data** - Use actual GitHub issues for testing, not just unit tests
7. **Consider edge cases** - Empty issues, very long content, special characters
8. **Validate AI responses** - Always check that AI output matches expected schema
9. **Monitor performance** - AI calls are the slowest part of the workflow
10. **Keep prompts focused** - Specific, clear prompts yield better results than verbose ones

### Engagement Mode Specific

11. **Understand the scoring algorithm** - Multiple factors contribute to engagement scores
12. **Test with various issue types** - Old/new, active/inactive, different engagement patterns
13. **Consider API rate limits** - Engagement scoring is API-intensive
14. **Validate score calculations** - Ensure scoring logic produces meaningful results
