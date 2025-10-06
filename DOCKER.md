# Docker Configuration for AI Triage Assistant

## Overview

The AI Triage Assistant is containerized using a multi-stage Docker build optimized for production deployment as a GitHub Action. The container uses Alpine Linux for minimal size and security.

## Build Instructions

### Local Development Build

```bash
# Build the Docker image
docker build -t triage-assistant .

# Test the container (requires GitHub token)
docker run --rm \
  -e GITHUB_TOKEN="your_token_here" \
  -e AI_TOKEN="your_ai_token_here" \
  -e AI_ENDPOINT="your_ai_endpoint_here" \
  -e MODE="engagement-score" \
  -e PROJECT="123" \
  triage-assistant
```

### Multi-Stage Build Details

#### Build Stage
- **Base Image**: `mcr.microsoft.com/dotnet/sdk:8.0-alpine`
- **Dependencies**: Restores only required NuGet packages for the Action project
- **Build**: Compiles the C# application with Release configuration
- **Output**: Self-contained Linux executable optimized for Alpine

#### Runtime Stage
- **Base Image**: `mcr.microsoft.com/dotnet/runtime:8.0-alpine`
- **Additional Tools**: GitHub CLI, git, CA certificates
- **Security**: Non-root user (triageuser:1001)
- **Size**: Optimized with minimal dependencies

## Container Features

### Security Hardening
- **Non-root execution**: Application runs as `triageuser` (UID 1001)
- **Minimal surface**: Only essential packages installed
- **Read-only filesystem**: Application directory owned by non-root user
- **CA certificates**: Included for secure HTTPS connections

### Environment Variables
- `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`: Optimized for containerized environments
- `DOTNET_USE_POLLING_FILE_WATCHER=true`: File watching compatibility
- `DOTNET_RUNNING_IN_CONTAINER=true`: Container-specific optimizations

### Dependencies
- **GitHub CLI**: Required for GraphQL operations and repository access
- **Git**: Repository cloning and file operations
- **CA certificates**: SSL/TLS certificate validation

## GitHub Actions Integration

The container is configured to work as a GitHub Action through `action.yml`:

```yaml
runs:
  using: docker
  image: Dockerfile
```

### Input Mapping
All 15 action inputs are automatically mapped to environment variables and processed by the containerized application:

- `GITHUB_TOKEN`: GitHub API authentication
- `AI_TOKEN`: AI service authentication  
- `AI_ENDPOINT`: AI service endpoint
- `MODE`: Operation mode (apply-labels, engagement-score)
- `PROJECT`: GitHub project number for engagement scoring
- `ISSUE`: Specific issue number for single-issue processing
- And 9 additional configuration inputs

## Build Optimization

### Layer Caching
1. **Project files copied first**: Enables dependency caching
2. **Source code copied separately**: Only rebuilds when code changes
3. **Multi-stage separation**: Build tools excluded from runtime image

### Size Optimization
- **Alpine Linux**: Minimal base OS (~5MB)
- **Self-contained**: No unnecessary .NET SDK components
- **Dependency pruning**: Only runtime dependencies included

## Troubleshooting

### Common Issues

#### Network Connectivity
If NuGet package restore fails during build:
```bash
# Use --network=host for development builds
docker build --network=host -t triage-assistant .
```

#### File Permissions
If the container fails with permission errors:
```bash
# Check that the non-root user has proper permissions
docker run --rm -it triage-assistant ls -la /app
```

#### GitHub CLI Access
If GitHub operations fail:
```bash
# Verify GitHub CLI is available
docker run --rm triage-assistant gh --version
```

### Debug Mode
For debugging container issues:
```bash
# Run interactive shell
docker run --rm -it triage-assistant /bin/sh

# Check application logs
docker run --rm \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  -e ACTIONS_STEP_DEBUG="true" \
  triage-assistant
```

## Production Deployment

The containerized action is ready for production use as a GitHub Action. Users can reference it in their workflows:

```yaml
- uses: mattleibow/triage-assistant@v1
  with:
    mode: 'engagement-score'
    project: '123'
    apply-scores: 'true'
```

The container will be built automatically by GitHub Actions when the workflow runs, providing a consistent execution environment across all GitHub-hosted runners.