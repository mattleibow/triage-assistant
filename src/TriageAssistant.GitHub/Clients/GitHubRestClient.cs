using Octokit;
using TriageAssistant.Core.Models;
using TriageAssistant.GitHub.Services;

namespace TriageAssistant.GitHub.Clients;

/// <summary>
/// GitHub REST API client using Octokit.NET
/// </summary>
public class GitHubRestClient : IGitHubIssueService
{
    private readonly GitHubClient _client;

    public GitHubRestClient(string token)
    {
        _client = new GitHubClient(new ProductHeaderValue("triage-assistant"))
        {
            Credentials = new Credentials(token)
        };
    }

    public async Task<IssueDetails> GetIssueDetailsAsync(string owner, string repo, int issueNumber)
    {
        var issue = await _client.Issue.Get(owner, repo, issueNumber);
        var comments = await _client.Issue.Comment.GetAllForIssue(owner, repo, issueNumber);
        var reactions = await _client.Reaction.Issue.GetAll(owner, repo, issueNumber);

        var issueDetails = new IssueDetails
        {
            Id = issue.NodeId,
            Number = issue.Number,
            Title = issue.Title,
            Body = issue.Body ?? string.Empty,
            Url = issue.HtmlUrl,
            CreatedAt = issue.CreatedAt.UtcDateTime,
            UpdatedAt = issue.UpdatedAt?.UtcDateTime ?? DateTime.UtcNow,
            State = issue.State.StringValue,
            Author = new UserDetails
            {
                Id = issue.User.NodeId,
                Login = issue.User.Login,
                Url = issue.User.HtmlUrl
            },
            Comments = new List<CommentDetails>(),
            Reactions = new List<ReactionDetails>(),
            Labels = issue.Labels.Select(l => l.Name).ToList(),
            LinkedPullRequests = new List<PullRequestDetails>() // Will need to implement PR linking
        };

        // Process comments
        foreach (var comment in comments)
        {
            var commentReactions = await _client.Reaction.IssueComment.GetAll(owner, repo, comment.Id);
            
            var commentDetails = new CommentDetails
            {
                Id = comment.NodeId,
                Body = comment.Body,
                CreatedAt = comment.CreatedAt.UtcDateTime,
                Author = new UserDetails
                {
                    Id = comment.User.NodeId,
                    Login = comment.User.Login,
                    Url = comment.User.HtmlUrl
                },
                Reactions = commentReactions.Select(r => new ReactionDetails
                {
                    Content = r.Content.StringValue,
                    CreatedAt = DateTime.UtcNow, // Reactions don't have CreatedAt in Octokit
                    User = new UserDetails
                    {
                        Id = r.User.NodeId,
                        Login = r.User.Login,
                        Url = r.User.HtmlUrl
                    }
                }).ToList()
            };

            issueDetails.Comments.Add(commentDetails);
        }

        // Process issue reactions
        foreach (var reaction in reactions)
        {
            var reactionDetails = new ReactionDetails
            {
                Content = reaction.Content.StringValue,
                CreatedAt = DateTime.UtcNow, // Reactions don't have CreatedAt in Octokit
                User = new UserDetails
                {
                    Id = reaction.User.NodeId,
                    Login = reaction.User.Login,
                    Url = reaction.User.HtmlUrl
                }
            };

            issueDetails.Reactions.Add(reactionDetails);
        }

        return issueDetails;
    }

    public async Task<IList<IssueDetails>> SearchIssuesAsync(string query)
    {
        var searchRequest = new SearchIssuesRequest(query);
        var searchResult = await _client.Search.SearchIssues(searchRequest);

        var issues = new List<IssueDetails>();
        
        foreach (var issue in searchResult.Items)
        {
            // For search results, we get basic issue info but need to fetch details
            var detailedIssue = await GetIssueDetailsAsync(
                issue.Repository.Owner.Login,
                issue.Repository.Name,
                issue.Number
            );
            issues.Add(detailedIssue);
        }

        return issues;
    }

    public async Task ApplyLabelsAsync(string owner, string repo, int issueNumber, IList<string> labels, bool dryRun = false)
    {
        if (dryRun)
        {
            Console.WriteLine($"Dry run: Would apply labels {string.Join(", ", labels)} to issue #{issueNumber}");
            return;
        }

        var update = new IssueUpdate();
        foreach (var label in labels)
        {
            update.AddLabel(label);
        }

        await _client.Issue.Update(owner, repo, issueNumber, update);
        Console.WriteLine($"Applied labels {string.Join(", ", labels)} to issue #{issueNumber}");
    }

    public async Task AddCommentAsync(string owner, string repo, int issueNumber, string comment, bool dryRun = false)
    {
        if (dryRun)
        {
            Console.WriteLine($"Dry run: Would add comment to issue #{issueNumber}: {comment.Substring(0, Math.Min(100, comment.Length))}...");
            return;
        }

        await _client.Issue.Comment.Create(owner, repo, issueNumber, comment);
        Console.WriteLine($"Added comment to issue #{issueNumber}");
    }

    public async Task AddReactionsAsync(string owner, string repo, int issueNumber, IList<string> reactions, bool dryRun = false)
    {
        if (dryRun)
        {
            Console.WriteLine($"Dry run: Would add reactions {string.Join(", ", reactions)} to issue #{issueNumber}");
            return;
        }

        foreach (var reaction in reactions)
        {
            if (Enum.TryParse<ReactionType>(reaction, true, out var reactionType))
            {
                await _client.Reaction.Issue.Create(owner, repo, issueNumber, new NewReaction(reactionType));
            }
        }
        
        Console.WriteLine($"Added reactions {string.Join(", ", reactions)} to issue #{issueNumber}");
    }
}