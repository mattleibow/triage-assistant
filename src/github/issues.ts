import * as github from '@actions/github'
import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as utils from '../utils.js'
import { GetIssueDetailsQuery, Sdk as GraphQLSdk } from '../generated/graphql.js'
import { GitHubIssueConfig, TriageConfig } from '../config.js'
import { IssueDetails, ReactionData, CommentData, UserInfo } from './types.js'
import { MissingInfoPayload } from '../triage/triage-response.js'

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
  const summary = await fs.promises.readFile(path.join(summaryFile), 'utf8')

  const commentBody = utils.sanitizeMarkdownContent(
    `
${summary}

${footer ?? ''}
`.trim()
  )

  // If the comment body is empty, do not post an empty comment
  if (commentBody.length === 0) {
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
  octokit: Octokit,
  labels: string[] | undefined,
  config: GitHubIssueConfig & TriageConfig
): Promise<void> {
  // Filter out empty labels
  labels = labels?.filter((label) => label.trim().length > 0)

  // If no labels to apply, return early
  if (!labels || labels.length === 0) {
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

/**
 * Builds a user-friendly comment requesting missing information with a hidden marker for upserts.
 *
 * @param data The missing info payload containing structured data about what's missing
 * @returns The formatted comment body with hidden HTML marker
 */
export function buildNeedsInfoComment(data: MissingInfoPayload): string {
  const parts: string[] = []

  // Add friendly greeting
  parts.push(
    `Thank you for reporting this issue! To help us investigate and resolve it effectively, we need some additional information.`
  )

  // Add missing information section if there are specific missing fields
  if (data.missing && data.missing.length > 0) {
    parts.push(`\n## Missing Information`)

    const missingItems = data.missing.map((item) => {
      switch (item.toLowerCase()) {
        case 'steps':
          return 'Clear steps to reproduce the issue'
        case 'code':
          return 'Code samples, repository link, or minimal reproducer'
        case 'description':
          return 'Detailed description of the expected vs actual behavior'
        default:
          return item
      }
    })

    parts.push(`We're missing the following information:\n${missingItems.map((item) => `- ${item}`).join('\n')}`)
  }

  // Add questions section if there are specific questions
  if (data.questions && data.questions.length > 0) {
    parts.push(`\n## Questions`)
    parts.push(
      `Please help us by answering these questions:\n${data.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    )
  }

  // Add helpful links section if available
  if (data.repro && data.repro.links && data.repro.links.length > 0) {
    parts.push(`\n## Helpful Links`)
    parts.push(`${data.repro.links.map((link) => `- ${link}`).join('\n')}`)
  }

  // Add security reminder if logs might be requested
  const hasLogRequest = data.questions?.some(
    (q) =>
      q.toLowerCase().includes('log') || q.toLowerCase().includes('error') || q.toLowerCase().includes('stack trace')
  )

  if (hasLogRequest) {
    parts.push(
      `\n> **Note**: When sharing logs or error messages, please review them first to ensure no sensitive information (API keys, passwords, personal data) is included.`
    )
  }

  // Add closing note
  parts.push(
    `\nOnce you provide this information, we'll be able to investigate your issue more effectively. Thank you for your patience!`
  )

  // Combine all parts with the hidden HTML marker for identification
  const commentBody = parts.join('\n')
  const hiddenMarker = `<!-- triage-assistant:needs-info-comment -->`

  return `${hiddenMarker}\n${commentBody}`
}

/**
 * Upserts a needs-info comment on an issue. If a comment with the hidden marker exists,
 * it updates that comment. Otherwise, creates a new comment.
 *
 * @param octokit The GitHub API client
 * @param data The missing info payload
 * @param config The triage configuration
 */
export async function upsertNeedsInfoComment(
  octokit: Octokit,
  data: MissingInfoPayload,
  config: GitHubIssueConfig & TriageConfig
): Promise<void> {
  if (config.dryRun) {
    const commentBody = buildNeedsInfoComment(data)
    core.info(`Dry run: Would upsert needs-info comment:\n${commentBody}`)
    return
  }

  const commentBody = buildNeedsInfoComment(data)
  const hiddenMarker = '<!-- triage-assistant:needs-info-comment -->'

  // Try to find existing needs-info comment
  const comments = await octokit.rest.issues.listComments({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber
  })

  const existingComment = comments.data.find((comment) => comment.body?.includes(hiddenMarker))

  if (existingComment) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner: config.repoOwner,
      repo: config.repoName,
      comment_id: existingComment.id,
      body: commentBody
    })
    core.info(`Updated existing needs-info comment (ID: ${existingComment.id})`)
  } else {
    // Create new comment
    await octokit.rest.issues.createComment({
      owner: config.repoOwner,
      repo: config.repoName,
      issue_number: config.issueNumber,
      body: commentBody
    })
    core.info('Created new needs-info comment')
  }
}

/**
 * Syncs needs-info labels (s/needs-info, s/needs-repro) based on the missing info response.
 * Adds labels if issues are found, removes them if nothing is missing.
 *
 * @param octokit The GitHub API client
 * @param data The missing info payload
 * @param config The triage configuration
 */
export async function syncNeedsInfoLabels(
  octokit: Octokit,
  data: MissingInfoPayload,
  config: GitHubIssueConfig & TriageConfig
): Promise<void> {
  if (config.dryRun) {
    const labelsToAdd = data.labels?.map((l) => l.label) || []
    core.info(`Dry run: Would sync needs-info labels: ${labelsToAdd.join(', ')}`)
    return
  }

  // Get current labels on the issue
  const currentLabels = await octokit.rest.issues.listLabelsOnIssue({
    owner: config.repoOwner,
    repo: config.repoName,
    issue_number: config.issueNumber
  })

  const currentLabelNames = currentLabels.data.map((label) => label.name)
  const needsInfoLabel = 's/needs-info'
  const needsReproLabel = 's/needs-repro'

  // Determine which labels should be present based on the response
  const shouldHaveLabels = new Set(data.labels?.map((l) => l.label) || [])

  // Add labels that should be present but aren't
  const labelsToAdd = Array.from(shouldHaveLabels).filter((label) => !currentLabelNames.includes(label))

  if (labelsToAdd.length > 0) {
    await octokit.rest.issues.addLabels({
      owner: config.repoOwner,
      repo: config.repoName,
      issue_number: config.issueNumber,
      labels: labelsToAdd
    })
    core.info(`Added labels: ${labelsToAdd.join(', ')}`)
  }

  // Remove needs-info related labels that shouldn't be present
  const needsInfoLabels = [needsInfoLabel, needsReproLabel]
  const labelsToRemove = needsInfoLabels.filter(
    (label) => currentLabelNames.includes(label) && !shouldHaveLabels.has(label)
  )

  for (const labelToRemove of labelsToRemove) {
    await octokit.rest.issues.removeLabel({
      owner: config.repoOwner,
      repo: config.repoName,
      issue_number: config.issueNumber,
      name: labelToRemove
    })
    core.info(`Removed label: ${labelToRemove}`)
  }
}
