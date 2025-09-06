# Use the official .NET 8 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory
WORKDIR /app

# Copy solution and project files
COPY TriageAssistant.sln ./
COPY src/TriageAssistant.Core/*.csproj ./src/TriageAssistant.Core/
COPY src/TriageAssistant.Action/*.csproj ./src/TriageAssistant.Action/
COPY tests/TriageAssistant.Tests/*.csproj ./tests/TriageAssistant.Tests/

# Restore dependencies
RUN dotnet restore

# Copy the rest of the application files
COPY src/ ./src/
COPY tests/ ./tests/

# Build the application
RUN dotnet publish src/TriageAssistant.Action/TriageAssistant.Action.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Use the official .NET 8 runtime image for the final image
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final

# Install git (needed for some GitHub operations)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the published application
COPY --from=build /app/publish .

# Set the entry point
ENTRYPOINT ["dotnet", "TriageAssistant.Action.dll"]