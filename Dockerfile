# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["src/TriageAssistant.Action/TriageAssistant.Action.csproj", "TriageAssistant.Action/"]
COPY ["src/TriageAssistant.Core/TriageAssistant.Core.csproj", "TriageAssistant.Core/"]
COPY ["src/TriageAssistant.GitHub/TriageAssistant.GitHub.csproj", "TriageAssistant.GitHub/"]

RUN dotnet restore "TriageAssistant.Action/TriageAssistant.Action.csproj"

# Copy source code
COPY src/ .

# Build and publish
RUN dotnet publish "TriageAssistant.Action/TriageAssistant.Action.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    --self-contained false

# Runtime stage
FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine
WORKDIR /app

# Install required packages for GitHub Actions environment
RUN apk add --no-cache ca-certificates git

# Copy published application
COPY --from=build /app/publish .

# Ensure the executable has proper permissions
RUN chmod +x /app/TriageAssistant.Action

ENTRYPOINT ["dotnet", "TriageAssistant.Action.dll"]