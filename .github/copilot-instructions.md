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

### Prompt Engineering Architecture

The action uses a two-tier prompt system:

- **System prompts** (`src/prompts/select-labels/system-prompt-*.ts`) - Define AI behavior for different triage
  templates
- **User prompts** (`src/prompts/select-labels/user-prompt.ts`) - Format issue content for analysis
- **Templates**: `single-label`, `multi-label`, `regression`, `missing-info`

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

## Best Practices for AI Assistance

When working with this codebase:

1. **Understand the prompt system** - Changes to prompts significantly affect AI behavior
2. **Test with real data** - Use actual GitHub issues for testing, not just unit tests
3. **Consider edge cases** - Empty issues, very long content, special characters
4. **Validate AI responses** - Always check that AI output matches expected schema
5. **Monitor performance** - AI calls are the slowest part of the workflow
6. **Keep prompts focused** - Specific, clear prompts yield better results than verbose ones
