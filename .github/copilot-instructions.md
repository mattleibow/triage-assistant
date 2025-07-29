# GitHub Copilot Instructions for AI Triage Assistant

## Project Overview

This is a sophisticated TypeScript GitHub Action that provides multi-mode triage capabilities including AI-powered issue
labeling and comprehensive engagement scoring. The action integrates with GitHub Projects v2, supports multiple
operational modes, and includes extensive testing infrastructure.

## Architecture Overview

### Multi-Mode Operation System

The action operates through a unified entry point with mode selection via the `TriageMode` enum:

- **Issue Triage Mode** (`issue-triage`) - Traditional AI-powered label application and commenting
- **Engagement Scoring Mode** (`engagement-score`) - Mathematical scoring based on community activity
- **Future Extensibility** - Architecture supports additional modes through enum expansion

### Core Module Structure

**`src/main.ts`** - Central orchestrator that:

- Determines operation mode based on template input
- Validates mode-specific inputs
- Routes to appropriate workflow functions
- Manages unified configuration

**`src/config.ts`** - Unified configuration system with:

- `EverythingConfig` interface extending all specific configs
- Type-safe input parsing and validation
- Default value management
- Environment variable handling

### Modular Domain Organization

#### Engagement Scoring Module (`src/engagement/`)

- **`engagement.ts`** - Main workflow orchestration for engagement scoring
- **`engagement-types.ts`** - TypeScript interfaces for engagement data structures

#### GitHub Integration Module (`src/github/`)

- **`issue-details.ts`** - Issue data processing, scoring calculations, and historic analysis
- **`issues.ts`** - Issue retrieval, manipulation, and REST API interactions
- **`projects.ts`** - GitHub Projects v2 GraphQL operations and field updates
- **`queries.ts`** - GraphQL query definitions and pagination handling

#### Triage Module (`src/triage/`)

- **`triage.ts`** - Traditional AI-powered triage workflow
- **`triage-response.ts`** - Response type definitions
- **`merge.ts`** - Response merging and processing logic

#### Prompts Module (`src/prompts/`)

- **`select-labels/`** - AI prompt engineering system with template-specific prompts
- **`summary/`** - Summary generation prompts
- **`prompts.ts`** - Unified prompt interface

#### Generated Module (`src/generated/`)

- **GraphQL code generation** from schema definitions
- Type-safe GraphQL operations and response handling

## Engagement Scoring System

### Mathematical Algorithm

The scoring system uses a weighted algorithm with carefully balanced factors:

```typescript
Score = (Comments × 3) + (Reactions × 1) + (Contributors × 2) + (TimeFactors × 1) + (PullRequests × 2)
```

**Scoring Components:**

- **Comments (3x)** - Discussion volume indicates high interest and complexity
- **Reactions (1x)** - Emotional engagement and community sentiment
- **Contributors (2x)** - Diversity of input reflects broad community interest
- **Time Factors (1x)** - Recent activity and issue age for relevance
- **Pull Requests (2x)** - Active development work on the issue

### Historic Analysis Features

- **7-Day Lookback** - Calculates previous week scores for trend analysis
- **Activity Filtering** - Precise date-based filtering of comments and reactions
- **Trend Classification** - Identifies "Hot" issues with increasing engagement
- **Temporal Scoring** - Separate current vs. historic score calculation

### Usage Modes and Configuration

**Project-Wide Engagement Scoring:**

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    template: engagement-score
    project: 123
    apply-scores: true
    project-column: 'Engagement Score'
```

**Single Issue Analysis:**

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    template: engagement-score
    issue: 456
    apply-scores: false
```

**Key Configuration Options:**

- `project` - GitHub Project number for bulk scoring operations
- `issue` - Specific issue number for single-issue analysis
- `project-column` - Field name in project to update (default: "Engagement Score")
- `apply-scores` - Controls whether to update project items with calculated scores
- `dry-run` - Run calculations without making changes

## GraphQL Integration Architecture

### GitHub Projects v2 API

The system uses GitHub's GraphQL API for efficient data operations:

**Project Operations:**

- **Item Retrieval** - Paginated fetching of all project items
- **Field Management** - Dynamic field lookup and validation
- **Score Updates** - Batch updates of project field values
- **Cross-Repository Support** - Handles issues from any repository within a project

**Query Optimization:**

- **Pagination Handling** - Proper cursor-based pagination for large datasets
- **Rate Limit Management** - Respects GitHub GraphQL complexity limits
- **Error Handling** - Graceful degradation for missing permissions or fields

### Issue Data Retrieval

Advanced GraphQL queries for comprehensive issue information:

- **Full Comment History** - All comments with reaction details and timestamps
- **Reaction Data** - Complete reaction information including user and creation date
- **Contributor Analysis** - Unique contributor counting across all activity
- **Pull Request Links** - Associated PR identification and status

## TypeScript and Build Architecture

### ES Modules Configuration

- **Modern JavaScript** - `"type": "module"` in package.json
- **Import Extensions** - `.js` extensions required for ES module compatibility
- **Strict TypeScript** - Multiple tsconfig files for different compilation targets
- **Type Safety** - Complete TypeScript coverage with strict null checks

### Build and Distribution

- **Rollup Bundling** - Compiles to single `dist/index.js` for GitHub Actions
- **GraphQL Code Generation** - Automated type-safe GraphQL operations from schema
- **Development Workflows** - Combined formatting, linting, testing, and packaging

### Build Commands

- `npm run all` - Complete build pipeline (codegen → format → lint → test → coverage → package)
- `npm run bundle` - Quick development build (format → package)
- `npm run local-action` - Local development testing with .env file
- `npm run codegen` - GraphQL code generation from schema

## Testing Infrastructure

### Comprehensive Test Strategy

The project maintains 120+ tests with extensive coverage across all modules:

**Test Organization:**

- **Module-Specific Tests** - Each module has corresponding test file in `__tests__/`
- **Integration Testing** - Full workflow testing for all operational modes
- **Edge Case Coverage** - Boundary conditions, null handling, error scenarios
- **Mock Infrastructure** - Sophisticated GitHub API mocking patterns

### Test Categories and Patterns

**Unit Tests:**

```typescript
describe('calculateScore', () => {
  it('should calculate correct score with all factors', () => {
    // Test individual function with various inputs
  })

  it('should handle edge cases like zero values', () => {
    // Test boundary conditions
  })
})
```

**Integration Tests:**

```typescript
describe('engagement workflow', () => {
  it('should complete project-wide scoring', async () => {
    // Test full workflow with mocked APIs
  })
})
```

**Mock Strategies:**

- **GitHub API Mocking** - Complete Octokit and GraphQL response mocking
- **Realistic Test Data** - Fixtures that mirror actual GitHub responses
- **Modular Mocking** - Module-level mocks for reliable testing
- **Error Scenario Testing** - Network failures, permission errors, missing data

### Jest Configuration

- **ES Modules Support** - `NODE_OPTIONS=--experimental-vm-modules`
- **TypeScript Integration** - Direct TypeScript execution without transpilation
- **Code Coverage** - Automated coverage badge generation
- **Parallel Execution** - Optimized test performance

## Development Workflows

### Adding New Features

**Complete Feature Development Process:**

1. **Plan the Feature** - Define interfaces, identify affected modules
2. **Write Types First** - Create TypeScript interfaces in appropriate modules
3. **Implement Core Logic** - Write the main functionality with proper error handling
4. **Write Comprehensive Tests** - Cover all scenarios (unit, integration, edge cases)
5. **Update Configuration** - Add new inputs to `action.yml` and config interfaces
6. **Document Usage** - Update README and provide usage examples
7. **Validate Integration** - Test with `npm run local-action` using `.env` file

**Example: Adding a New Scoring Factor**

```typescript
// 1. Update types in src/github/issue-details.ts
export interface ScoringFactors {
  comments: number
  reactions: number
  contributors: number
  timeFactors: number
  pullRequests: number
  newFactor: number // Add new factor
}

// 2. Update calculation logic
export function calculateScore(issue: IssueDetails): number {
  const newFactorScore = calculateNewFactor(issue)
  return comments * 3 + reactions * 1 + contributors * 2 + timeFactors * 1 + pullRequests * 2 + newFactorScore * weight
}

// 3. Write comprehensive tests
describe('calculateScore with new factor', () => {
  it('should include new factor in calculation', () => {
    // Test new factor integration
  })

  it('should handle edge cases for new factor', () => {
    // Test boundary conditions
  })
})
```

### Adding New Operational Modes

**Mode Extension Process:**

1. **Extend TriageMode Enum** - Add new mode to enum in `src/main.ts`
2. **Create Mode Module** - New directory under `src/` for mode-specific logic
3. **Update Main Orchestrator** - Add mode detection and routing logic
4. **Implement Workflow Function** - Create main workflow function for the mode
5. **Add Configuration** - Extend config interfaces for mode-specific inputs
6. **Write Complete Tests** - Full test coverage for new mode
7. **Update Action Definition** - Add new inputs to `action.yml`

### Working with GraphQL Operations

**Adding New GraphQL Operations:**

1. **Define Query/Mutation** - Add to `src/github/queries.ts`
2. **Run Code Generation** - `npm run codegen` to generate TypeScript types
3. **Implement Operation** - Use generated SDK for type-safe operations
4. **Handle Pagination** - Implement proper cursor-based pagination if needed
5. **Add Error Handling** - Comprehensive error handling for GraphQL errors
6. **Test GraphQL Operations** - Mock GraphQL responses in tests

## Code Quality and Standards

### TypeScript Conventions

- **Explicit Return Types** - All public functions must declare return types
- **Interface Definitions** - Prefer interfaces over types for object structures
- **Null Safety** - Proper handling of nullable values throughout
- **Error Boundaries** - Comprehensive try-catch blocks with meaningful messages

### File and Module Organization

- **kebab-case** - File names use kebab-case (e.g., `issue-details.ts`)
- **camelCase** - Variable and function names use camelCase
- **Domain Modules** - Organize by domain (engagement, triage, github)
- **Clear Exports** - Explicit exports with clear interfaces

### Error Handling Patterns

```typescript
export async function complexOperation(): Promise<Result> {
  try {
    // Main operation logic
    return await performOperation()
  } catch (error) {
    core.error(`Operation failed: ${error.message}`)
    if (error instanceof SpecificError) {
      // Handle specific error types
    }
    throw new Error(`Detailed error context: ${error.message}`)
  }
}
```

## Testing Best Practices

### Always Write Comprehensive Tests

When adding any new functionality, you must write comprehensive tests that follow existing patterns:

**Test Requirements:**

1. **Unit Tests** - Test each function individually with various inputs
2. **Integration Tests** - Test component interactions and workflows
3. **Edge Cases** - Empty inputs, null values, boundary conditions
4. **Error Scenarios** - Invalid inputs, API failures, missing data
5. **Common Paths** - Normal usage scenarios with typical data

**Test Organization:**

- Group related tests with descriptive `describe` blocks
- Use clear test names that explain the scenario being tested
- Follow existing mock patterns in `__tests__/` directory
- Create realistic test data that mirrors actual GitHub responses
- Test both success and failure scenarios consistently

**Mock Strategy:**

- Use Jest mocks for external APIs and file system operations
- Create comprehensive mock data that covers real-world scenarios
- Mock at the module level rather than individual function level when possible
- Avoid over-mocking - test real logic where appropriate
- Use fixtures in `__tests__/testData/` for complex mock data

**Specific Testing Focus Areas:**

- **Score Calculation Functions** - Test with various issue states, activity levels, and edge cases
- **GraphQL Operations** - Mock query responses and test error handling thoroughly
- **Configuration Parsing** - Test all input combinations and validation logic
- **Date/Time Handling** - Test historic calculations and timezone handling
- **Pagination Logic** - Test cursor-based pagination with various page sizes

### Test Quality Standards

- No "trivial" tests like `expect(true).toBe(true)`
- Each test should verify meaningful business logic
- Tests should be maintainable and not overly coupled to implementation details
- Use descriptive assertions that clearly indicate what failed when tests break

## Performance and Security Considerations

### API Rate Limiting

- **GraphQL Complexity** - GitHub GraphQL API has complexity-based rate limiting
- **Pagination Strategies** - Use appropriate page sizes to balance performance and limits
- **Batch Operations** - Group related operations to minimize API calls
- **Retry Logic** - Implement exponential backoff for transient failures

### Security Guidelines

- **Token Management** - Never log GitHub tokens or API keys
- **Input Sanitization** - Validate and sanitize all user inputs before processing
- **AI Model Security** - Sanitize issue content before sending to AI models
- **Output Validation** - Validate AI responses before applying to GitHub

### Memory and Performance

- **Stream Processing** - Use streaming for large datasets when possible
- **Memory Management** - Proper cleanup of large objects and arrays
- **Caching Strategies** - Cache expensive operations where appropriate
- **Async Operations** - Proper async/await usage for non-blocking operations

## Debugging and Troubleshooting

### Development Debugging

- **Local Testing** - Use `npm run local-action` with `.env` file for development
- **Debug Logging** - Enable with `ACTIONS_STEP_DEBUG=true` environment variable
- **Response Files** - AI responses and engagement data saved to temp files for inspection
- **GraphQL Debugging** - Log GraphQL queries and responses in debug mode

### Common Issues and Solutions

- **Build Failures** - Check TypeScript compilation and dependency versions
- **Test Failures** - Verify mock data structure matches current interfaces
- **GraphQL Errors** - Check permissions and field availability in target repositories
- **Rate Limiting** - Implement proper retry logic and respect API limits

## Action Configuration and Usage

### Input Validation and Defaults

All action inputs are defined in `action.yml` with proper defaults and validation:

```yaml
# Mode Selection
template:
  description: 'Triage template: multi-label, single-label, regression, missing-info, engagement-score'
  default: ''

# Engagement Scoring
project:
  description: 'Project number for engagement scoring'
  default: ''

issue:
  description: 'Issue number for single-issue analysis'
  default: ''
```

### Configuration Processing

The `EverythingConfig` interface unifies all configuration options:

- Type-safe input parsing with proper type conversion
- Default value application and validation
- Environment variable integration
- Mode-specific configuration validation

This comprehensive instruction set provides the foundation for understanding and extending the AI Triage Assistant
codebase. When working on new features, always refer to existing patterns and maintain the established architectural
principles.
