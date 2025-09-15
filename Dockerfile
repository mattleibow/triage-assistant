# Multi-stage build for optimized .NET Alpine container
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

# Set working directory
WORKDIR /app

# Copy project files first for better caching
COPY src/TriageAssistant.Core/TriageAssistant.Core.csproj ./src/TriageAssistant.Core/
COPY src/TriageAssistant.GitHub/TriageAssistant.GitHub.csproj ./src/TriageAssistant.GitHub/
COPY src/TriageAssistant.Action/TriageAssistant.Action.csproj ./src/TriageAssistant.Action/

# Restore dependencies for the action project (will restore all dependencies)
RUN dotnet restore src/TriageAssistant.Action/TriageAssistant.Action.csproj

# Copy source code
COPY src/ ./src/

# Build and publish the application
RUN dotnet publish src/TriageAssistant.Action/TriageAssistant.Action.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    --runtime linux-musl-x64 \
    --self-contained false

# Runtime stage - use minimal Alpine image
FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine AS runtime

# Install GitHub CLI for GraphQL operations and git for repository access
RUN apk add --no-cache \
    github-cli \
    git \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S triageuser && \
    adduser -u 1001 -S triageuser -G triageuser

# Set working directory
WORKDIR /app

# Copy published application
COPY --from=build /app/publish .

# Change ownership to non-root user
RUN chown -R triageuser:triageuser /app

# Switch to non-root user
USER triageuser

# Set environment variables for .NET
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV DOTNET_RUNNING_IN_CONTAINER=true

# Set entrypoint to the action executable
ENTRYPOINT ["dotnet", "TriageAssistant.Action.dll"]