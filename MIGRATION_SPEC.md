# TypeScript to C#/.NET Migration Specification

## Executive Summary

This document provides a comprehensive specification for migrating the AI Triage Assistant GitHub Action from TypeScript to C#/.NET while preserving all functionality as a drop-in replacement. The migration will use Docker containers for deployment and extract non-GitHub specific functionality into a reusable class library.

## Current Architecture Analysis

### Project Overview
- **Name**: AI Triage Assistant
- **Language**: TypeScript (ES Modules)
- **Runtime**: Node.js 20
- **Lines of Code**: ~30 TypeScript source files, ~16 test files with 245+ tests
- **Coverage**: 94.45% statement coverage
- **Dependencies**: 14 production dependencies, 27 dev dependencies

### Core Functionality Modes
1. **Apply Labels Mode** (`apply-labels`): AI-powered label application using batch configuration
2. **Engagement Score Mode** (`engagement-score`): Mathematical scoring based on community activity

### Key Components

#### 1. Entry Points (src/main.ts, src/apply-labels.ts, src/engagement-score.ts)
- Multi-mode operation system with unified configuration
- Sub-action architecture for focused functionality
- Central orchestrator that routes to appropriate workflows

#### 2. Configuration System (src/config.ts, src/config-file.ts)
- `EverythingConfig` interface extending all specific configs
- YAML configuration loading (.triagerc.yml)
- Type-safe input parsing and validation
- Environment variable handling with fallbacks

#### 3. AI Integration (src/ai/, src/prompts/)
- Azure AI Inference integration (@azure-rest/ai-inference)
- Template-based prompt engineering system
- Multiple prompt types: multi-label, single-label, regression, missing-info
- Summary generation capabilities

#### 4. GitHub Integration (src/github/)
- **Issues Management**: Issue retrieval, labeling, commenting, reactions
- **Projects Integration**: GitHub Projects v2 GraphQL operations
- **GraphQL Operations**: Type-safe operations with code generation
- **Search Capabilities**: Bulk issue processing via GitHub search queries

#### 5. Engagement Scoring (src/engagement/)
- Mathematical algorithm with configurable weights
- 7-day lookback for historic analysis
- Components: Comments, Reactions, Contributors, Time Factors, Pull Requests
- Project field updates with calculated scores

#### 6. Build and Distribution
- Rollup bundling to single dist/index.js
- GraphQL code generation from schema
- ES Modules with .js extensions
- Three entry points: main, apply-labels, engagement-score

#### 7. Testing Infrastructure
- Jest with ES Modules support
- 245+ tests with comprehensive coverage
- FileSystemMock for file operations testing
- Mock strategies for GitHub API interactions

## Migration Plan

### Phase 1: Infrastructure Setup

#### 1.1 Project Structure
```
TriageAssistant/
├── src/
│   ├── TriageAssistant.Core/              # Reusable class library
│   │   ├── Models/                        # Data models and configurations
│   │   ├── Services/                      # Business logic services
│   │   ├── AI/                           # AI integration (Azure AI Inference)
│   │   ├── Engagement/                   # Engagement scoring logic
│   │   ├── Configuration/                # Configuration management
│   │   └── Utils/                        # Utility functions
│   ├── TriageAssistant.GitHub/           # GitHub-specific functionality
│   │   ├── Services/                     # GitHub API interactions
│   │   ├── Models/                       # GitHub-specific models
│   │   ├── GraphQL/                      # GraphQL operations
│   │   └── Extensions/                   # GitHub integration extensions
│   └── TriageAssistant.Action/           # GitHub Action entry point
│       ├── Program.cs                    # Main entry point
│       ├── Modes/                        # Mode-specific handlers
│       └── Docker/                       # Docker configuration
├── tests/
│   ├── TriageAssistant.Core.Tests/
│   ├── TriageAssistant.GitHub.Tests/
│   └── TriageAssistant.Action.Tests/
├── schemas/                              # GraphQL schemas
├── Dockerfile                            # Docker container definition
└── action.yml                           # GitHub Action definition
```

#### 1.2 Technology Stack
- **Framework**: .NET 8.0 (LTS)
- **Language**: C# 12
- **Container**: Docker with Ubuntu/Alpine base
- **Testing**: xUnit with NSubstitute
- **JSON**: System.Text.Json
- **YAML**: YamlDotNet
- **HTTP**: HttpClient with Polly for resilience
- **GraphQL**: Octokit.GraphQL.NET
- **AI**: Azure.AI.Inference

#### 1.3 Docker Configuration
```dockerfile
FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine
COPY publish/ /app/
WORKDIR /app
ENTRYPOINT ["dotnet", "TriageAssistant.Action.dll"]
```

### Phase 2: Core Library Migration (TriageAssistant.Core)

#### 2.1 Configuration System
**Target**: Migrate src/config.ts, src/config-file.ts

```csharp
// Models/Configuration/EverythingConfig.cs
public class EverythingConfig : ITriageConfig, IEngagementConfig, IGitHubConfig
{
    public string AiEndpoint { get; set; }
    public string AiModel { get; set; }
    public string AiToken { get; set; }
    // ... other properties matching TypeScript interface
}

// Services/ConfigurationService.cs
public class ConfigurationService
{
    public async Task<ConfigFile> LoadConfigFileAsync(string[] configPaths)
    public async Task<EverythingConfig> BuildConfigAsync()
    public T ValidateInput<T>(string input, string fieldName)
}
```

#### 2.2 Engagement Scoring Engine
**Target**: Migrate src/engagement/

```csharp
// Models/Engagement/ScoringFactors.cs
public class ScoringFactors
{
    public int Comments { get; set; }
    public int Reactions { get; set; }
    public int Contributors { get; set; }
    public double TimeFactors { get; set; }
    public int PullRequests { get; set; }
}

// Services/EngagementScoringService.cs
public class EngagementScoringService
{
    public async Task<double> CalculateScoreAsync(IssueDetails issue, EngagementWeights weights)
    public async Task<EngagementResult> AnalyzeHistoricTrendsAsync(IssueDetails issue)
    public async Task<List<EngagementResult>> ScoreProjectIssuesAsync(int projectNumber)
}
```

#### 2.3 AI Integration
**Target**: Migrate src/ai/, src/prompts/

```csharp
// Services/AIInferenceService.cs
public class AIInferenceService
{
    private readonly InferenceClient _client;
    
    public async Task<string> RunInferenceAsync(string systemPrompt, string userPrompt)
    public async Task<TriageResponse> SelectLabelsAsync(IssueDetails issue, ConfigFileLabelGroup group)
    public async Task<string> GenerateSummaryAsync(string mergedResponseFile)
}

// Services/PromptService.cs
public class PromptService
{
    public string GetSystemPrompt(string template, ConfigFileLabelGroup group)
    public string GetUserPrompt(IssueDetails issue)
}
```

#### 2.4 Utilities and Validation
**Target**: Migrate src/utils.ts

```csharp
// Utils/ValidationUtils.cs
public static class ValidationUtils
{
    public static int ValidateNumericInput(string input, string fieldName)
    public static int? ValidateOptionalNumericInput(string input, string fieldName)
    public static TriageMode ValidateMode(string input)
    public static void ValidateRepositoryId(string owner, string repo)
}

// Utils/FileSystemUtils.cs
public static class FileSystemUtils
{
    public static async Task<string> ReadFileAsync(string path)
    public static async Task WriteFileAsync(string path, string content)
    public static async Task EnsureDirectoryExistsAsync(string path)
}
```

### Phase 3: GitHub Integration Layer (TriageAssistant.GitHub)

#### 3.1 GitHub API Services
**Target**: Migrate src/github/issues.ts

```csharp
// Services/GitHubIssueService.cs
public class GitHubIssueService
{
    private readonly GitHubClient _client;
    
    public async Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int issueNumber)
    public async Task ApplyLabelsToIssueAsync(List<string> labels, GitHubIssueConfig config)
    public async Task CommentOnIssueAsync(string summaryFile, GitHubIssueConfig config, string footer = null)
    public async Task AddEyesReactionAsync(GitHubIssueConfig config)
    public async Task RemoveEyesReactionAsync(GitHubIssueConfig config)
    public async Task<List<SearchIssue>> SearchIssuesAsync(string query)
}
```

#### 3.2 Projects Integration
**Target**: Migrate src/github/projects.ts

```csharp
// Services/GitHubProjectsService.cs
public class GitHubProjectsService
{
    private readonly GitHubClient _restClient; // Using Octokit.NET for REST API operations
    private readonly Connection _graphQLConnection; // Using Octokit.GraphQL.NET for GraphQL operations
    
    public async Task<List<ProjectItem>> GetProjectItemsAsync(int projectNumber)
    public async Task UpdateProjectFieldAsync(ProjectItem item, string fieldName, double score)
    public async Task<ProjectField> GetProjectFieldAsync(int projectNumber, string fieldName)
}
```

#### 3.3 GraphQL Operations
**Target**: Migrate src/generated/graphql.ts and src/github/queries/

**Approach**: Use Octokit.GraphQL.NET as the dedicated GraphQL client for GitHub API operations, providing type-safe GraphQL operations with C# LINQ expressions and excellent GitHub integration.

```csharp
// GraphQL/GitHubGraphQLClient.cs
public class GitHubGraphQLClient
{
    private readonly Connection _connection; // Using Octokit.GraphQL.NET
    
    public async Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int number)
    {
        var query = new Query()
            .Repository(owner, repo)
            .Issue(number)
            .Select(issue => new IssueDetails
            {
                Id = issue.Id,
                Title = issue.Title,
                Body = issue.Body,
                Comments = issue.Comments(null, null, null, null).AllPages()
                    .Select(comment => new IssueComment
                    {
                        Body = comment.Body,
                        CreatedAt = comment.CreatedAt,
                        Author = comment.Author.Login,
                        Reactions = comment.Reactions(null, null, null, null).AllPages()
                            .Select(reaction => new Reaction
                            {
                                Content = reaction.Content,
                                User = reaction.User.Login,
                                CreatedAt = reaction.CreatedAt
                            }).ToList()
                    }).ToList(),
                // Additional fields...
            });
            
        return await _connection.Run(query);
    }
    
    public async Task<List<ProjectItem>> GetProjectItemsAsync(int projectNumber)
    {
        var query = new Query()
            .Node(projectId)
            .Cast<ProjectV2>()
            .Items(null, null, null, null)
            .AllPages()
            .Select(item => new ProjectItem
            {
                Id = item.Id,
                Content = item.Content.Select(content => new ProjectItemContent
                {
                    // Map content based on type
                }).Single(),
                FieldValues = item.FieldValues(null, null, null, null).AllPages()
                    .Select(fieldValue => new ProjectFieldValue
                    {
                        // Map field values
                    }).ToList()
            });
            
        return await _connection.Run(query);
    }
}

// Models/GraphQL/ (Strongly-typed C# models for GraphQL responses)
public class IssueDetails
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string Body { get; set; }
    public List<IssueComment> Comments { get; set; }
    // Additional properties...
}

public class ProjectItem
{
    public string Id { get; set; }
    public ProjectItemContent Content { get; set; }
    public List<ProjectFieldValue> FieldValues { get; set; }
}
```

### Phase 4: Action Entry Points (TriageAssistant.Action)

#### 4.1 Main Program Entry Point
**Target**: Migrate src/main.ts, src/index.ts

```csharp
// Program.cs
public class Program
{
    public static async Task<int> Main(string[] args)
    {
        try
        {
            var serviceProvider = ConfigureServices();
            var workflow = serviceProvider.GetRequiredService<IWorkflowOrchestrator>();
            
            var mode = GetTriageMode(args);
            await workflow.RunWorkflowAsync(mode);
            
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            return 1;
        }
    }
    
    private static TriageMode GetTriageMode(string[] args)
    {
        // Parse mode from command line arguments or environment variables
    }
}
```

#### 4.2 Workflow Orchestrator
**Target**: Central workflow logic from src/main.ts

```csharp
// Services/WorkflowOrchestrator.cs
public class WorkflowOrchestrator : IWorkflowOrchestrator
{
    public async Task<string> RunWorkflowAsync(TriageMode? modeOverride = null)
    {
        var config = await _configService.BuildConfigAsync();
        var configFile = await _configService.LoadConfigFileAsync();
        
        return mode switch
        {
            TriageMode.ApplyLabels => await _triageService.RunTriageWorkflowAsync(config, configFile.Labels),
            TriageMode.EngagementScore => await _engagementService.RunEngagementWorkflowAsync(config, configFile.Engagement),
            _ => throw new ArgumentException($"Unknown triage mode: {mode}")
        };
    }
}
```

#### 4.3 Mode-Specific Handlers
**Target**: Migrate src/triage/triage.ts, src/engagement/engagement.ts

```csharp
// Modes/TriageWorkflowHandler.cs
public class TriageWorkflowHandler
{
    public async Task<string> RunTriageWorkflowAsync(LabelTriageWorkflowConfig config, ConfigFileLabels configFile)
    public async Task<string> MergeAndApplyTriageAsync(ApplyLabelsConfig config)
}

// Modes/EngagementWorkflowHandler.cs
public class EngagementWorkflowHandler
{
    public async Task<string> RunEngagementWorkflowAsync(EngagementScoringConfig config, ConfigFileEngagement configFile)
    public async Task ProcessProjectEngagementAsync(int projectNumber, EngagementWeights weights)
    public async Task ProcessSingleIssueEngagementAsync(int issueNumber, EngagementWeights weights)
}
```

### Phase 5: AI Integration (Azure.AI.Inference) - ✅ COMPLETED

#### 5.1 AI Services Infrastructure
**Target**: Migrate src/ai/ai.ts

✅ **Completed Implementation:**
```csharp
// Services/AI/IAIInferenceService.cs
public interface IAIInferenceService
{
    Task<AIInferenceResponse> RunInferenceAsync(AIInferenceRequest request, CancellationToken cancellationToken = default);
    bool IsConfigured { get; }
}

// Services/AI/AzureAIInferenceService.cs
public class AzureAIInferenceService : IAIInferenceService
{
    public async Task<AIInferenceResponse> RunInferenceAsync(AIInferenceRequest request, CancellationToken cancellationToken = default)
    {
        var messages = new List<ChatRequestMessage>
        {
            new ChatRequestSystemMessage(request.SystemPrompt),
            new ChatRequestUserMessage(request.UserPrompt)
        };
        
        var completionsOptions = new ChatCompletionsOptions(messages)
        {
            MaxTokens = request.MaxTokens,
            Model = request.Model
        };
        
        var response = await _client.CompleteAsync(completionsOptions, null, cancellationToken);
        return new AIInferenceResponse { Content = response.Value.Choices[0].Message.Content };
    }
}
```

#### 5.2 Prompt Engineering System
**Target**: Migrate src/prompts/ directory

✅ **Completed Implementation:**
```csharp
// Services/Prompts/IPromptService.cs
public interface IPromptService
{
    Task<string> GeneratePromptAsync(string templateContent, Dictionary<string, object> variables, string token, CancellationToken cancellationToken = default);
    string GetTemplate(string templateName);
}

// Services/Prompts/PromptTemplates.cs
public static class PromptTemplates
{
    public const string MultiLabelSystemPrompt = "You are an expert triage assistant...";
    public const string SingleLabelSystemPrompt = "You are an expert triage assistant...";
    public const string RegressionSystemPrompt = "You specialize in identifying regression issues...";
    public const string MissingInfoSystemPrompt = "You identify missing information...";
    public const string SummarySystemPrompt = "You create concise summaries...";
    public const string UserPrompt = "Please analyze the following GitHub issue...";
    public const string SummaryUserPrompt = "Please create a summary based on...";
}

// Services/Prompts/PromptService.cs
public class PromptService : IPromptService
{
    public async Task<string> GeneratePromptAsync(string templateContent, Dictionary<string, object> variables, string token, CancellationToken cancellationToken = default)
    {
        // Template variable substitution
        // GitHub CLI command execution for EXEC: directives
        // Dynamic content generation
    }
}
```

#### 5.3 Triage Workflow System
**Target**: Migrate src/triage/triage.ts

✅ **Completed Implementation:**
```csharp
// Services/Triage/ITriageService.cs
public interface ITriageService
{
    Task<string> SelectLabelsAsync(LabelSelectionConfig config, CancellationToken cancellationToken = default);
    Task<string> GenerateSummaryAsync(SummaryConfig config, string mergedResponseFile, CancellationToken cancellationToken = default);
    Task<TriageResponse> MergeResponsesAsync(string responsesDir, string outputPath, CancellationToken cancellationToken = default);
}

// Services/Workflows/ITriageWorkflowService.cs
public interface ITriageWorkflowService
{
    Task<string> RunSingleIssueTriageWorkflowAsync(SingleIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken = default);
    Task<string> RunBulkTriageWorkflowAsync(BulkIssueTriageConfig config, LabelsConfiguration labelsConfig, CancellationToken cancellationToken = default);
    Task<string> MergeAndApplyTriageAsync(ApplyTriageConfig config, CancellationToken cancellationToken = default);
}
```

#### 5.4 Complete Apply-Labels Workflow
**Target**: Complete apply-labels sub-action functionality

✅ **Completed Features:**
- **AI-Powered Label Selection**: Full integration with Azure.AI.Inference
- **Multi-Template Support**: multi-label, single-label, regression, missing-info templates
- **Bulk Processing**: Support for issue queries and batch processing
- **Response Merging**: JSON response aggregation and processing
- **Summary Generation**: AI-powered issue summaries
- **GitHub CLI Integration**: Dynamic label fetching and issue content retrieval
- **Configuration Support**: .triagerc.yml label groups configuration
- **Dry-Run Mode**: Safe testing without making actual changes

#### 5.5 Updated Workflow Orchestrator
**Target**: Complete integration in action entry point

✅ **Completed Integration:**
```csharp
// Services/WorkflowOrchestrator.cs
private async Task<string> RunLabelingWorkflow(ActionInputs inputs)
{
    // Validate AI configuration
    if (string.IsNullOrEmpty(inputs.AiEndpoint) || string.IsNullOrEmpty(inputs.EffectiveAiToken))
        throw new InvalidOperationException("AI endpoint and token are required for labeling workflow");
    
    // Create AI service with actual configuration
    var aiService = new AzureAIInferenceService(_loggerFactory.CreateLogger<AzureAIInferenceService>(), inputs.AiEndpoint, inputs.EffectiveAiToken);
    
    // Load labels configuration
    var triageConfig = await _configService.LoadTriageConfigurationAsync();
    
    // Determine workflow type and run appropriate workflow
    if (!string.IsNullOrEmpty(inputs.IssueQuery))
        return await _triageWorkflowService.RunBulkTriageWorkflowAsync(bulkConfig, triageConfig.Labels);
    else if (inputs.Issue.HasValue && inputs.Issue.Value > 0)
        return await _triageWorkflowService.RunSingleIssueTriageWorkflowAsync(singleConfig, triageConfig.Labels);
    else
        throw new InvalidOperationException("Either issue number or issue query must be provided for labeling workflow");
}
```

### Phase 6: Complete Testing - 📋 NEXT

#### 6.1 Test Infrastructure
**Target**: Migrate __tests__/ directory structure

```csharp
// Tests setup with xUnit and NSubstitute
[Fact]
public async Task ShouldCalculateCorrectScoreWithAllFactors()
{
    // Arrange
    var mockService = Substitute.For<IGitHubIssueService>();
    var scoringService = new EngagementScoringService(mockService);
    
    // Act & Assert
    var result = await scoringService.CalculateScoreAsync(issueDetails, weights);
    Assert.Equal(expectedScore, result, precision: 2);
}

// File system mocking with temporary directories
public class FileSystemTestFixture : IDisposable
{
    public string TempDirectory { get; }
    
    public FileSystemTestFixture()
    {
        TempDirectory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(TempDirectory);
    }
}
```

#### 5.2 Test Coverage Targets
- **Unit Tests**: All core business logic (EngagementScoringService, AIInferenceService, etc.)
- **Integration Tests**: GitHub API interactions, GraphQL operations
- **End-to-End Tests**: Full workflow execution with mocked external dependencies
- **Security Tests**: Path traversal, input validation, token handling

### Phase 7: Docker Configuration

#### 7.1 Multi-Stage Dockerfile
```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy project files
COPY ["src/TriageAssistant.Action/TriageAssistant.Action.csproj", "TriageAssistant.Action/"]
COPY ["src/TriageAssistant.Core/TriageAssistant.Core.csproj", "TriageAssistant.Core/"]
COPY ["src/TriageAssistant.GitHub/TriageAssistant.GitHub.csproj", "TriageAssistant.GitHub/"]

# Restore dependencies
RUN dotnet restore "TriageAssistant.Action/TriageAssistant.Action.csproj"

# Copy source code
COPY src/ .

# Build and publish
RUN dotnet publish "TriageAssistant.Action/TriageAssistant.Action.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine
WORKDIR /app
COPY --from=build /app/publish .

# Install required packages
RUN apk add --no-cache ca-certificates

ENTRYPOINT ["dotnet", "TriageAssistant.Action.dll"]
```

#### 7.2 Action Definition Updates
```yaml
# action.yml updates for Docker container
runs:
  using: 'docker'
  image: 'Dockerfile'
  # All existing inputs and outputs remain the same
```

### Phase 8: Dependency Mapping

#### 8.1 TypeScript to C# Package Mapping

| TypeScript Package | C# Equivalent | Purpose |
|-------------------|---------------|---------|
| @actions/core | Environment Variables | GitHub Actions input/output |
| @actions/github | Octokit.NET | GitHub API client |
| @azure-rest/ai-inference | Azure.AI.Inference | AI model integration |
| graphql-request | Octokit.GraphQL.NET | GraphQL operations |
| js-yaml | YamlDotNet | YAML configuration parsing |
| uuid | System.Guid | UUID generation |
| jest | xUnit + NSubstitute | Testing framework |

#### 7.2 New Dependencies Required
```xml
<PackageReference Include="Octokit" Version="latest" />
<PackageReference Include="Octokit.GraphQL" Version="latest" />
<PackageReference Include="Azure.AI.Inference" Version="latest" />
<PackageReference Include="YamlDotNet" Version="latest" />
<PackageReference Include="System.Text.Json" Version="latest" />
<PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="latest" />
<PackageReference Include="Microsoft.Extensions.Configuration" Version="latest" />
<PackageReference Include="Microsoft.Extensions.Logging" Version="latest" />
<PackageReference Include="Polly" Version="latest" />

<!-- Test Dependencies -->
<PackageReference Include="xunit" Version="latest" />
<PackageReference Include="xunit.runner.visualstudio" Version="latest" />
<PackageReference Include="NSubstitute" Version="latest" />
```

### Phase 8: Configuration and Compatibility

#### 8.1 Environment Variable Mapping
All existing environment variables remain the same:
- `GITHUB_TOKEN` → Environment.GetEnvironmentVariable("GITHUB_TOKEN")
- `TRIAGE_AI_TOKEN` → Environment.GetEnvironmentVariable("TRIAGE_AI_TOKEN")
- `RUNNER_TEMP` → Environment.GetEnvironmentVariable("RUNNER_TEMP")

#### 8.2 Action Input Compatibility
All 15 action inputs must be preserved exactly:
- token, fallback-token, ai-endpoint, ai-model, ai-token
- issue, issue-query, mode, project, project-column, apply-scores
- apply-labels, apply-comment, comment-footer, dry-run

#### 8.3 Output Compatibility
Single output `response-file` must be maintained with same behavior.

## Implementation Checklist

### Infrastructure & Setup
- [x] Create solution structure with three projects (Core, GitHub, Action)
- [x] Set up .NET 8.0 project files with correct dependencies
- [ ] Configure Docker multi-stage build
- [ ] Set up CI/CD pipeline for .NET build and test
- [x] Implement dependency injection container
- [x] Configure logging and error handling

### Core Library (TriageAssistant.Core)
- [x] Migrate configuration system with YAML support
- [x] Implement engagement scoring algorithm with weight configuration
- [ ] Create AI inference service with Azure AI Inference
- [ ] Build prompt engineering system with template support
- [x] Implement utility functions and validation
- [x] Create file system operations with proper error handling

### GitHub Integration (TriageAssistant.GitHub)
- [x] Implement GitHub API client with Octokit.NET
- [x] Create GraphQL client using Octokit.GraphQL.NET for Projects v2 operations
- [ ] Migrate issue management (get, label, comment, reactions)
- [x] Implement project field updates and item retrieval
- [ ] Add search functionality for bulk issue processing
- [ ] Handle GitHub API rate limiting and retries

### Action Entry Points (TriageAssistant.Action)
- [x] Create main program entry point with argument parsing
- [x] Implement workflow orchestrator for mode routing
- [ ] Build triage workflow handler (Phase 5)
- [x] Build engagement scoring workflow handler
- [x] Implement sub-action support (apply-labels, engagement-score)
- [x] Add comprehensive error handling and logging

### Testing Infrastructure
- [ ] Create test projects for all three assemblies
- [ ] Implement file system mocking strategies
- [ ] Create GitHub API mocking with NSubstitute
- [ ] Write unit tests for all core business logic (245+ tests)
- [ ] Add integration tests for GitHub operations
- [ ] Implement end-to-end workflow tests
- [ ] Add security tests for path traversal and input validation
- [ ] Set up test coverage reporting

### Docker & Deployment
- [ ] Create optimized Dockerfile with Alpine Linux
- [ ] Update action.yml for Docker container execution
- [ ] Test container build and execution locally
- [ ] Validate all environment variable handling
- [ ] Ensure proper secret handling in container

### Validation & Quality Assurance
- [ ] Verify all 15 action inputs work identically
- [ ] Test both operational modes (apply-labels, engagement-score)
- [ ] Validate GraphQL operations against GitHub Projects v2
- [ ] Test AI inference with Azure AI models
- [ ] Verify YAML configuration file parsing
- [ ] Test bulk issue processing with search queries
- [ ] Validate engagement scoring algorithm accuracy
- [ ] Test error handling and edge cases
- [ ] Performance testing for large issue sets
- [ ] Security audit for token handling and input validation

### Documentation & Migration
- [ ] Update README.md with C# usage examples
- [ ] Create migration guide for users
- [ ] Document new Docker container usage
- [ ] Update contribution guidelines for C# development
- [ ] Create troubleshooting guide for common issues

## Acceptance Criteria

### Functional Requirements
1. **Drop-in Replacement**: All existing workflows using the TypeScript version must work without modification
2. **Feature Parity**: Both operational modes (apply-labels, engagement-score) must function identically
3. **Configuration Compatibility**: All .triagerc.yml configurations must work unchanged
4. **API Compatibility**: All GitHub API operations must produce identical results
5. **AI Integration**: Azure AI Inference must work with same prompts and responses

### Performance Requirements
1. **Execution Time**: C# version should execute within 10% of TypeScript performance
2. **Memory Usage**: Container memory usage should not exceed 512MB for typical operations
3. **API Rate Limits**: Must respect GitHub API rate limits identically

### Quality Requirements
1. **Test Coverage**: Minimum 90% code coverage across all projects
2. **Error Handling**: Comprehensive error handling with clear error messages
3. **Logging**: Structured logging for debugging and monitoring
4. **Security**: No regression in security posture, proper secret handling

### Deployment Requirements
1. **Container Size**: Docker image should be under 200MB
2. **Startup Time**: Container startup should complete within 10 seconds
3. **Cross-Platform**: Must work on GitHub Actions Ubuntu, Windows, and macOS runners

## Risk Mitigation

### Technical Risks
1. **GraphQL Complexity**: Use Octokit.GraphQL.NET for type-safe GraphQL operations with excellent GitHub integration, test extensively
2. **AI Integration**: Verify Azure AI Inference compatibility early
3. **Docker Performance**: Optimize with multi-stage builds and Alpine base image
4. **GitHub API Changes**: Pin to specific API versions, add integration tests

### Migration Risks
1. **Breaking Changes**: Extensive testing with existing workflows
2. **Feature Gaps**: Comprehensive feature mapping and validation
3. **Performance Regression**: Benchmark testing against TypeScript version
4. **User Adoption**: Clear migration documentation and backward compatibility

## Success Metrics

1. **Zero Breaking Changes**: All existing workflows continue to work
2. **Complete Test Suite**: 245+ tests migrated and passing
3. **Performance Maintained**: Execution time within 10% of TypeScript version
4. **Container Efficiency**: Small, fast-starting Docker image
5. **Code Quality**: High test coverage and clean architecture
6. **User Experience**: Seamless transition for existing users

## Timeline Estimate

- **Phase 1-2 (Infrastructure + Core)**: 3-4 weeks
- **Phase 3 (GitHub Integration)**: 2-3 weeks  
- **Phase 4 (Action Entry Points)**: 1-2 weeks
- **Phase 5 (Testing Migration)**: 2-3 weeks
- **Phase 6-8 (Docker + Validation)**: 1-2 weeks

**Total Estimated Duration**: 9-14 weeks for complete migration

This specification provides a comprehensive roadmap for migrating the AI Triage Assistant from TypeScript to C#/.NET while maintaining all functionality and ensuring it serves as a true drop-in replacement.