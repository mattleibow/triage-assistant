using FluentAssertions;
using NSubstitute;
using TriageAssistant.Core.Configuration;
using TriageAssistant.Core.Models;
using TriageAssistant.Core.Services;
using TriageAssistant.GitHub.Services;
using Xunit;

namespace TriageAssistant.GitHub.Tests.Services;

public class EngagementWorkflowServiceTests : IDisposable
{
    private readonly IGitHubIssueService _mockIssueService;
    private readonly IGitHubProjectsService _mockProjectsService;
    private readonly EngagementScoringService _scoringService;
    private readonly EngagementWorkflowService _workflowService;
    private readonly string _tempDirectory;

    public EngagementWorkflowServiceTests()
    {
        _mockIssueService = Substitute.For<IGitHubIssueService>();
        _mockProjectsService = Substitute.For<IGitHubProjectsService>();
        _scoringService = new EngagementScoringService(new EngagementWeights());
        _workflowService = new EngagementWorkflowService(_mockIssueService, _mockProjectsService, _scoringService);
        
        _tempDirectory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDirectory);
    }

    [Fact]
    public async Task RunEngagementWorkflowAsync_WithSingleIssue_ShouldCalculateScore()
    {
        // Arrange
        var config = new EngagementWorkflowConfiguration
        {
            Token = "test-token",
            RepoOwner = "testowner",
            RepoName = "testrepo",
            IssueNumber = 123,
            ProjectColumn = "Engagement Score",
            ApplyScores = false,
            TempDir = _tempDirectory,
            DryRun = false
        };

        var engagementConfig = new EngagementConfiguration();

        var testIssue = CreateTestIssue();
        _mockIssueService.GetIssueDetailsAsync("testowner", "testrepo", 123)
            .Returns(testIssue);

        // Act
        var resultFile = await _workflowService.RunEngagementWorkflowAsync(config, engagementConfig);

        // Assert
        resultFile.Should().NotBeNull();
        File.Exists(resultFile).Should().BeTrue();

        var jsonContent = await File.ReadAllTextAsync(resultFile);
        jsonContent.Should().Contain("123"); // Should contain the issue number
        jsonContent.Should().Contain("TotalItems"); // PascalCase in C# JSON

        await _mockIssueService.Received(1).GetIssueDetailsAsync("testowner", "testrepo", 123);
    }

    [Fact]
    public async Task RunEngagementWorkflowAsync_WithProject_ShouldCalculateScoresForMultipleIssues()
    {
        // Arrange
        var config = new EngagementWorkflowConfiguration
        {
            Token = "test-token",
            RepoOwner = "testowner",
            RepoName = "testrepo",
            ProjectNumber = 1,
            ProjectColumn = "Engagement Score",
            ApplyScores = true,
            TempDir = _tempDirectory,
            DryRun = true
        };

        var engagementConfig = new EngagementConfiguration();

        var testProject = new ProjectDetails
        {
            Id = "project-1",
            Number = 1,
            Title = "Test Project",
            Url = "https://github.com/testowner/projects/1"
        };

        _mockProjectsService.GetProjectDetailsAsync("testowner", 1)
            .Returns(testProject);

        // Setup multiple issues
        for (int i = 1; i <= 3; i++)
        {
            _mockIssueService.GetIssueDetailsAsync("testowner", "testrepo", i)
                .Returns(CreateTestIssue(i));
        }

        // Act
        var resultFile = await _workflowService.RunEngagementWorkflowAsync(config, engagementConfig);

        // Assert
        resultFile.Should().NotBeNull();
        File.Exists(resultFile).Should().BeTrue();

        var jsonContent = await File.ReadAllTextAsync(resultFile);
        jsonContent.Should().Contain("Test Project");
        jsonContent.Should().Contain("TotalItems"); // PascalCase in C# JSON

        await _mockProjectsService.Received(1).GetProjectDetailsAsync("testowner", 1);
        await _mockProjectsService.Received(1).UpdateProjectWithScoresAsync(
            "testowner", 1, "Engagement Score", Arg.Any<IList<EngagementItem>>(), true);
    }

    [Fact]
    public async Task RunEngagementWorkflowAsync_WithoutIssueOrProject_ShouldThrowException()
    {
        // Arrange
        var config = new EngagementWorkflowConfiguration
        {
            Token = "test-token",
            RepoOwner = "testowner",
            RepoName = "testrepo",
            ProjectColumn = "Engagement Score",
            ApplyScores = false,
            TempDir = _tempDirectory,
            DryRun = false
        };

        var engagementConfig = new EngagementConfiguration();

        // Act & Assert
        await FluentActions.Invoking(() => _workflowService.RunEngagementWorkflowAsync(config, engagementConfig))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Either IssueNumber or ProjectNumber must be specified*");
    }

    private static IssueDetails CreateTestIssue(int issueNumber = 123)
    {
        return new IssueDetails
        {
            Id = $"issue-{issueNumber}",
            Number = issueNumber,
            Title = $"Test Issue {issueNumber}",
            Body = "Test issue body",
            Url = $"https://github.com/testowner/testrepo/issues/{issueNumber}",
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddHours(-1),
            State = "open",
            Author = new UserDetails
            {
                Id = "user1",
                Login = "testuser",
                Url = "https://github.com/testuser"
            },
            Comments = new List<CommentDetails>
            {
                new CommentDetails
                {
                    Id = "comment1",
                    Body = "Test comment",
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    Author = new UserDetails
                    {
                        Id = "user2",
                        Login = "commenter",
                        Url = "https://github.com/commenter"
                    },
                    Reactions = new List<ReactionDetails>()
                }
            },
            Reactions = new List<ReactionDetails>
            {
                new ReactionDetails
                {
                    Content = "👍",
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    User = new UserDetails
                    {
                        Id = "user3",
                        Login = "reactor",
                        Url = "https://github.com/reactor"
                    }
                }
            },
            Labels = new List<string> { "bug", "enhancement" },
            LinkedPullRequests = new List<PullRequestDetails>()
        };
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, true);
        }
    }
}