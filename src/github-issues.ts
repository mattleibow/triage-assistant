import * as github from '@actions/github'
import * as core from '@actions/core'
import * as fs from 'fs'
import { TriageResponse } from './triage-response.js'
import { GitHubIssueConfig, TriageConfig } from './triage-config.js'
import { IssueDetails, CommentData, ReactionData } from './issue-details.js'

/**
 * Comments on an issue with the provided summary.
 *
 * @param summaryFile Path to the file containing the summary text.
 * @param config The triage configuration object.
 * @param octokit The GitHub API client.
 */
export async function commentOnIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  summaryFile: string,
  config: GitHubIssueConfig & TriageConfig,
  footer?: string
): Promise<void> {
  const summary = await fs.promises.readFile(summaryFile, 'utf8')

  const commentBody = `
${summary}

${footer}
`

  if (commentBody.trim().length === 0) {
    return
  }

  if (config.dryRun) {
    core.info(`Dry run: Skipping commenting on issue: ${commentBody}`)
    return
  }

  await octokit.rest.issues.createComment({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber,
    body: commentBody
  })
}

/**
 * Applies labels to an issue based on the merged response data.
 *
 * @param mergedResponse The merged response containing labels to apply.
 * @param config The triage configuration object.
 * @param octokit The GitHub API client.
 */
export async function applyLabelsToIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  mergedResponse: TriageResponse,
  config: GitHubIssueConfig & TriageConfig
): Promise<void> {
  const labels = mergedResponse.labels?.map((l) => l.label)?.filter(Boolean) || []

  if (labels.length === 0) {
    return
  }

  if (config.dryRun) {
    core.info(`Dry run: Skipping applying labels: ${labels.join(', ')}`)
    return
  }

  await octokit.rest.issues.addLabels({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber,
    labels
  })
}

/**
 * Adds an 'eyes' reaction to the specified issue using the provided Octokit instance and config.
 * Ignores errors if the reaction already exists or is successfully created.
 *
 * @param octokit - An authenticated Octokit instance
 * @param config - The configuration for the repository and issue
 */
export async function addEyes(octokit: ReturnType<typeof github.getOctokit>, config: GitHubIssueConfig & TriageConfig) {
  if (config.dryRun) {
    core.info('Dry run: Skipping adding eyes reaction.')
    return
  }

  try {
    await octokit.rest.reactions.createForIssue({
      owner: config.repoOwner,
      repo: config.repoName,
      issue_number: config.issueNumber,
      content: 'eyes'
    })
  } catch (e) {
    const err = e as { status?: number }
    if (!err.status || (err.status !== 200 && err.status !== 201 && err.status !== 409)) {
      throw e
    }
  }
}

/**
 * Removes the 'eyes' reaction from the specified issue if it was added by github-actions[bot].
 *
 * @param octokit - An authenticated Octokit instance
 * @param config - The configuration for the repository and issue
 */
export async function removeEyes(
  octokit: ReturnType<typeof github.getOctokit>,
  config: GitHubIssueConfig & TriageConfig
) {
  if (config.dryRun) {
    core.info('Dry run: Skipping removing eyes reaction.')
    return
  }

  const reactions = await octokit.rest.reactions.listForIssue({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber
  })
  for (const reaction of reactions.data) {
    if (reaction.content === 'eyes' && reaction.user?.login === 'github-actions[bot]') {
      await octokit.rest.reactions.deleteForIssue({
        owner: config.repoOwner,
        repo: config.repoName,
        issue_number: config.issueNumber,
        reaction_id: reaction.id
      })
    }
  }
}

/**
 * Get detailed information about an issue including comments and reactions using GraphQL
 */
export async function getIssueDetails(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueDetails> {
  const query = `
    query($owner: String!, $repo: String!, $issueNumber: Int!, $commentsCursor: String, $reactionsCursor: String) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          id
          number
          title
          body
          state
          createdAt
          updatedAt
          closedAt
          author {
            login
            ... on User {
              id
            }
          }
          assignees(first: 100) {
            nodes {
              login
              id
            }
          }
          reactions(first: 100, after: $reactionsCursor) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              content
              createdAt
              user {
                login
                id
              }
            }
          }
          comments(first: 100, after: $commentsCursor) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              createdAt
              author {
                login
                ... on User {
                  id
                }
              }
              reactions(first: 100) {
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  content
                  createdAt
                  user {
                    login
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  // Get issue with first batch of comments and reactions
  const result = await octokit.graphql<any>(query, {
    owner,
    repo,
    issueNumber,
    commentsCursor: null,
    reactionsCursor: null
  })

  const issue = result.repository.issue
  
  // Get all reactions for the issue
  const allReactions: ReactionData[] = []
  let reactionsCursor: string | null = null
  let hasNextReactions = issue.reactions.pageInfo.hasNextPage

  // Add first batch of reactions
  issue.reactions.nodes.forEach((reaction: any) => {
    allReactions.push({
      id: reaction.id,
      user: {
        login: reaction.user.login,
        id: reaction.user.id,
        type: 'User'
      },
      reaction: reaction.content.toLowerCase(),
      created_at: reaction.createdAt
    })
  })

  reactionsCursor = issue.reactions.pageInfo.endCursor

  // Paginate through remaining reactions
  while (hasNextReactions) {
    const nextResult = await octokit.graphql<any>(query, {
      owner,
      repo,
      issueNumber,
      commentsCursor: null,
      reactionsCursor
    })

    const nextReactions = nextResult.repository.issue.reactions
    nextReactions.nodes.forEach((reaction: any) => {
      allReactions.push({
        id: reaction.id,
        user: {
          login: reaction.user.login,
          id: reaction.user.id,
          type: 'User'
        },
        reaction: reaction.content.toLowerCase(),
        created_at: reaction.createdAt
      })
    })

    hasNextReactions = nextReactions.pageInfo.hasNextPage
    reactionsCursor = nextReactions.pageInfo.endCursor
  }

  // Get all comments
  const allComments: CommentData[] = []
  let commentsCursor: string | null = null
  let hasNextComments = issue.comments.pageInfo.hasNextPage

  // Add first batch of comments
  for (const comment of issue.comments.nodes) {
    const commentReactions: ReactionData[] = []
    
    // Get comment reactions
    comment.reactions.nodes.forEach((reaction: any) => {
      commentReactions.push({
        id: reaction.id,
        user: {
          login: reaction.user.login,
          id: reaction.user.id,
          type: 'User'
        },
        reaction: reaction.content.toLowerCase(),
        created_at: reaction.createdAt
      })
    })

    allComments.push({
      id: parseInt(comment.id),
      user: {
        login: comment.author.login,
        id: comment.author.id,
        type: 'User'
      },
      created_at: comment.createdAt,
      reactions: commentReactions.length,
      reactions_data: commentReactions
    })
  }

  commentsCursor = issue.comments.pageInfo.endCursor

  // Paginate through remaining comments
  while (hasNextComments) {
    const nextResult = await octokit.graphql<any>(query, {
      owner,
      repo,
      issueNumber,
      commentsCursor,
      reactionsCursor: null
    })

    const nextComments = nextResult.repository.issue.comments
    for (const comment of nextComments.nodes) {
      const commentReactions: ReactionData[] = []
      
      // Get comment reactions
      comment.reactions.nodes.forEach((reaction: any) => {
        commentReactions.push({
          id: reaction.id,
          user: {
            login: reaction.user.login,
            id: reaction.user.id,
            type: 'User'
          },
          reaction: reaction.content.toLowerCase(),
          created_at: reaction.createdAt
        })
      })

      allComments.push({
        id: parseInt(comment.id),
        user: {
          login: comment.author.login,
          id: comment.author.id,
          type: 'User'
        },
        created_at: comment.createdAt,
        reactions: commentReactions.length,
        reactions_data: commentReactions
      })
    }

    hasNextComments = nextComments.pageInfo.hasNextPage
    commentsCursor = nextComments.pageInfo.endCursor
  }

  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    state: issue.state.toLowerCase(),
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
    closed_at: issue.closedAt,
    comments: allComments.length,
    reactions: allReactions.length,
    reactions_data: allReactions,
    comments_data: allComments,
    user: {
      login: issue.author.login,
      id: issue.author.id,
      type: 'User'
    },
    assignees: issue.assignees.nodes.map((assignee: any) => ({
      login: assignee.login,
      id: assignee.id,
      type: 'User'
    }))
  }
}
