import * as github from '@actions/github'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { GetIssueDetailsQuery, Sdk as GraphQLSdk } from '../generated/graphql.js'
import { GitHubIssueConfig, TriageConfig } from '../config.js'
import { IssueDetails, CommentData, ReactionData, UserInfo } from './issue-details.js'

/**
 * Sanitizes markdown content to prevent injection attacks
 */
function sanitizeMarkdownContent(content: string): string {
  // Remove potentially dangerous HTML tags and scripts
  return content
    .replace(/<script[^>]*>.*?<\/script>/gims, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gims, '')
    .replace(/<object[^>]*>.*?<\/object>/gims, '')
    .replace(/<embed[^>]*>/gims, '')
    .replace(/javascript:/gims, '')
    .replace(/data:/gims, '')
    // Limit line length to prevent abuse
    .split('\n')
    .map(line => line.substring(0, 2000))
    .join('\n')
    // Limit total content length
    .substring(0, 65000)
}

type Octokit = ReturnType<typeof github.getOctokit>
type GetIssueDetailsQueryIssue = NonNullable<NonNullable<GetIssueDetailsQuery['repository']>['issue']>
type GetIssueDetailsQueryIssueReactions = NonNullable<
  NonNullable<NonNullable<GetIssueDetailsQuery['repository']>['issue']>['reactions']
>
type GetIssueDetailsQueryIssueComments = NonNullable<
  NonNullable<NonNullable<GetIssueDetailsQuery['repository']>['issue']>['comments']
>

/**
 * Comments on an issue with the provided summary.
 *
 * @param summaryFile Path to the file containing the summary text.
 * @param config The triage configuration object.
 * @param octokit The GitHub API client.
 */
export async function commentOnIssue(
  octokit: Octokit,
  summaryFile: string,
  config: GitHubIssueConfig & TriageConfig,
  footer?: string
): Promise<void> {
  // Validate file path to prevent directory traversal
  const resolvedPath = path.resolve(summaryFile)
  const tempDirPath = path.resolve(config.tempDir || process.cwd())
  
  // Allow paths within temp directory or common temp locations for flexibility
  const allowedPaths = [
    tempDirPath,
    '/tmp',
    process.env.TMPDIR || '',
    process.env.TEMP || '',
    process.env.TMP || ''
  ].filter(Boolean).map(p => path.resolve(p))
  
  const isAllowed = allowedPaths.some(allowedPath => resolvedPath.startsWith(allowedPath))
  if (!isAllowed) {
    throw new Error(`Invalid file path: File must be within allowed directories`)
  }

  let summary: string
  try {
    summary = await fs.promises.readFile(resolvedPath, 'utf8')
  } catch (error) {
    throw new Error(`Failed to read summary file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Sanitize summary content to prevent injection attacks
  summary = sanitizeMarkdownContent(summary)

  const commentBody = `
${summary}

${footer ?? ''}
`.trim()

  // If the comment body is empty, do not post an empty comment
  if (commentBody.length === 0) {
    return
  }

  if (config.dryRun) {
    core.info(`Dry run: Skipping commenting on issue`)
    core.debug(`Comment body would be: ${commentBody}`)
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
  octokit: Octokit,
  labels: string[] | undefined,
  config: GitHubIssueConfig & TriageConfig
): Promise<void> {
  // Filter out empty labels and validate them
  labels = labels
    ?.filter((label) => label.trim().length > 0)
    ?.map((label) => label.trim())
    ?.filter((label) => {
      // Validate label format (GitHub allows alphanumeric, spaces, hyphens, underscores, periods)
      return /^[a-zA-Z0-9\s\-_.]+$/.test(label) && label.length <= 50
    })

  // If no labels to apply, return early
  if (!labels || labels.length === 0) {
    return
  }

  // Limit number of labels to prevent abuse
  if (labels.length > 20) {
    core.warning(`Too many labels (${labels.length}), limiting to first 20`)
    labels = labels.slice(0, 20)
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
export async function addEyes(octokit: Octokit, config: GitHubIssueConfig & TriageConfig) {
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
export async function removeEyes(octokit: Octokit, config: GitHubIssueConfig & TriageConfig) {
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
  graphql: GraphQLSdk,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueDetails> {
  // Get issue with first batch of comments and reactions
  const result = await graphql.GetIssueDetails({ owner, repo, issueNumber })

  // Check if the issue exists
  const issue = result.repository?.issue
  if (!issue) {
    throw new Error(`Issue not found: ${owner}/${repo}#${issueNumber}`)
  }

  // Get all reactions for the issue
  const allReactions: ReactionData[] = await getIssueReactions(graphql, issue, owner, repo, issueNumber)

  // Get all comments
  const allComments: CommentData[] = await getIssueComments(graphql, issue, owner, repo, issueNumber)

  const issueDetails: IssueDetails = {
    id: issue.id,
    owner: owner,
    repo: repo,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state.toLowerCase(),
    createdAt: new Date(issue.createdAt),
    updatedAt: new Date(issue.updatedAt),
    closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
    comments: allComments,
    reactions: allReactions,
    user: {
      login: issue.author?.login || '',
      type: issue.author?.__typename || ''
    },
    assignees: getAssignees(issue)
  }

  return issueDetails
}

function getAssignees(issue: GetIssueDetailsQueryIssue): UserInfo[] {
  const allAssignees: UserInfo[] = []

  if (!issue.assignees.nodes) {
    return allAssignees
  }

  issue.assignees.nodes.map((assignee) => {
    if (!assignee) {
      return
    }

    allAssignees.push({
      login: assignee.login,
      type: assignee.__typename || ''
    })
  })

  return allAssignees
}

async function getIssueReactions(
  graphql: GraphQLSdk,
  issue: GetIssueDetailsQueryIssue,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<ReactionData[]> {
  const allReactions: ReactionData[] = []

  // Add first batch of reactions
  let reactionsCursor = addReactions(issue.reactions, allReactions)

  // Paginate through remaining reactions
  while (reactionsCursor) {
    const nextResult = await graphql.GetIssueDetails({
      owner,
      repo,
      issueNumber,
      commentsCursor: null,
      reactionsCursor
    })

    reactionsCursor = addReactions(nextResult?.repository?.issue?.reactions, allReactions)
  }

  return allReactions
}

async function getIssueComments(
  graphql: GraphQLSdk,
  issue: GetIssueDetailsQueryIssue,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<CommentData[]> {
  const allComments: CommentData[] = []

  if (!issue.comments.nodes) {
    return allComments
  }

  // Add first batch of comments
  let commentsCursor = addComments(issue.comments, allComments)

  // Paginate through remaining comments
  while (commentsCursor) {
    const nextResult = await graphql.GetIssueDetails({
      owner,
      repo,
      issueNumber,
      commentsCursor,
      reactionsCursor: null
    })

    commentsCursor = addComments(nextResult?.repository?.issue?.comments, allComments)
  }

  return allComments
}

function addReactions(
  reactions: GetIssueDetailsQueryIssueReactions | undefined,
  allReactions: ReactionData[]
): string | null | undefined {
  if (!reactions?.nodes) {
    return null
  }

  reactions.nodes.forEach((reaction) => {
    if (!reaction) {
      return
    }

    allReactions.push({
      user: {
        login: reaction.user?.login || '',
        type: reaction.user?.__typename || ''
      },
      reaction: reaction.content.toLowerCase(),
      createdAt: new Date(reaction.createdAt)
    })
  })

  if (!reactions.pageInfo.hasNextPage) {
    return null
  }

  return reactions.pageInfo.endCursor
}

function addComments(
  comments: GetIssueDetailsQueryIssueComments | undefined,
  allComments: CommentData[]
): string | null | undefined {
  if (!comments?.nodes) {
    return null
  }

  comments.nodes.forEach((comment) => {
    if (!comment) {
      return
    }

    const allReactions: ReactionData[] = []
    addReactions(comment.reactions, allReactions)

    allComments.push({
      user: {
        login: comment.author?.login || '',
        type: comment.author?.__typename || ''
      },
      createdAt: new Date(comment.createdAt),
      reactions: allReactions
    })
  })

  if (!comments.pageInfo.hasNextPage) {
    return null
  }

  return comments.pageInfo.endCursor
}
