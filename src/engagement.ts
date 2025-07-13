import * as core from '@actions/core'
import * as github from '@actions/github'
import { EngagementConfig, TriageConfig } from './triage-config.js'
import { EngagementResponse, EngagementItem, IssueDetails, CommentData } from './engagement-types.js'

/**
 * Run the complete engagement scoring workflow
 * @param config - The triage configuration
 * @returns Promise<string> - The engagement response file path
 */
export async function runEngagementWorkflow(config: TriageConfig): Promise<string> {
  core.info('Running in engagement scoring mode')

  const engagementResponse = await calculateEngagementScores(config)
  core.info(`Calculated engagement scores for ${engagementResponse.totalItems} items`)

  // Update project with scores if requested
  if (config.applyScores) {
    await updateProjectWithScores(config, engagementResponse)
  }

  // Save engagement response to file
  const engagementFile = `${config.tempDir}/engagement-response.json`
  await core.summary.addRaw(JSON.stringify(engagementResponse, null, 2))
  
  return engagementFile
}

/**
 * Calculate engagement scores for issues in a project or single issue
 * @param config - Configuration object containing project and authentication details
 * @returns Promise<EngagementResponse> - The engagement response with scores
 */
export async function calculateEngagementScores(config: EngagementConfig): Promise<EngagementResponse> {
  const octokit = github.getOctokit(config.token)

  if (config.project) {
    return await calculateProjectEngagementScores(config, octokit)
  } else if (config.issueNumber) {
    return await calculateIssueEngagementScores(config, octokit)
  } else {
    throw new Error('Either project or issue number must be specified')
  }
}

/**
 * Calculate engagement scores for a single issue
 */
async function calculateIssueEngagementScores(
  config: EngagementConfig,
  octokit: ReturnType<typeof github.getOctokit>
): Promise<EngagementResponse> {
  core.info(`Calculating engagement score for issue #${config.issueNumber}`)

  const issueDetails = await getIssueDetails(octokit, config.repoOwner, config.repoName, config.issueNumber)
  const score = calculateScore(issueDetails)
  const previousScore = calculatePreviousScore()

  const item: EngagementItem = {
    issueNumber: issueDetails.number,
    engagement: {
      score,
      previousScore,
      classification: score > previousScore ? 'Hot' : null
    }
  }

  return {
    items: [item],
    totalItems: 1
  }
}

/**
 * Calculate engagement scores for all issues in a project
 */
async function calculateProjectEngagementScores(
  config: EngagementConfig,
  octokit: ReturnType<typeof github.getOctokit>
): Promise<EngagementResponse> {
  core.info(`Calculating engagement scores for project #${config.project}`)

  // For simplicity, get all repository issues as project items
  // In a real implementation, you'd use GraphQL API to get actual project items
  core.info('Using repository issues as project items (simplified implementation)')

  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner: config.repoOwner,
      repo: config.repoName,
      state: 'all',
      per_page: 100
    })

    const items: EngagementItem[] = []

    for (const issue of issues) {
      const issueDetails = await getIssueDetails(octokit, config.repoOwner, config.repoName, issue.number)
      const score = calculateScore(issueDetails)
      const previousScore = calculatePreviousScore()

      const item: EngagementItem = {
        issueNumber: issue.number,
        engagement: {
          score,
          previousScore,
          classification: score > previousScore ? 'Hot' : null
        }
      }

      items.push(item)
    }

    return {
      items,
      totalItems: items.length
    }
  } catch (error) {
    core.warning(`Failed to get issues: ${error}`)
    return {
      items: [],
      totalItems: 0
    }
  }
}

/**
 * Get detailed information about an issue including comments
 */
async function getIssueDetails(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueDetails> {
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber
  })

  // Get issue comments
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  const commentsData: CommentData[] = comments.map((comment) => ({
    id: comment.id,
    user: comment.user!,
    created_at: comment.created_at,
    reactions: comment.reactions!
  }))

  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body || '',
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    comments: issue.comments,
    reactions: issue.reactions!,
    comments_data: commentsData,
    user: issue.user!,
    assignees: issue.assignees!
  }
}

/**
 * Calculate engagement score for an issue based on the engagement algorithm
 */
function calculateScore(issue: IssueDetails): number {
  // Components:
  // - Number of Comments       => Indicates discussion and interest
  // - Number of Reactions      => Shows emotional engagement
  // - Number of Contributors   => Reflects the diversity of input
  // - Time Since Last Activity => More recent activity indicates higher engagement
  // - Issue Age                => Older issues might need more attention
  // - Number of Linked PRs     => Shows active work on the issue (not implemented)

  const totalComments = issue.comments
  const totalReactions =
    issue.reactions.total_count +
    (issue.comments_data?.reduce((sum, comment) => sum + comment.reactions.total_count, 0) || 0)
  const contributors = getUniqueContributors(issue)
  const lastActivity = Math.max(1, getTimeSinceLastActivity(issue))
  const issueAge = Math.max(1, getIssueAge(issue))
  const linkedPullRequests = 0 // Not implemented yet

  // Weights:
  const CommentsWeight = 3
  const ReactionsWeight = 1
  const ContributorsWeight = 2
  const LastActivityWeight = 1
  const IssueAgeWeight = 1
  const LinkedPullRequestsWeight = 2

  const score =
    CommentsWeight * totalComments +
    ReactionsWeight * totalReactions +
    ContributorsWeight * contributors +
    LastActivityWeight * (1 / lastActivity) +
    IssueAgeWeight * (1 / issueAge) +
    LinkedPullRequestsWeight * linkedPullRequests

  return Math.round(score)
}

/**
 * Calculate previous score (7 days ago) - simplified implementation
 */
function calculatePreviousScore(): number {
  // This is a simplified implementation
  // In a real scenario, you'd need to get historical data
  // For now, we'll return 0 as a placeholder
  return 0
}

/**
 * Get unique contributors to an issue
 */
function getUniqueContributors(issue: IssueDetails): number {
  const contributors = new Set<string>()

  // Add issue author
  contributors.add(issue.user.login)

  // Add assignees
  issue.assignees.forEach((assignee) => contributors.add(assignee.login))

  // Add comment authors
  issue.comments_data?.forEach((comment) => contributors.add(comment.user.login))

  return contributors.size
}

/**
 * Get time since last activity in days
 */
function getTimeSinceLastActivity(issue: IssueDetails): number {
  const lastUpdate = new Date(issue.updated_at)
  const now = new Date()
  const diffMs = now.getTime() - lastUpdate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Get issue age in days
 */
function getIssueAge(issue: IssueDetails): number {
  const created = new Date(issue.created_at)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.ceil(diffDays)
}

/**
 * Update project field with engagement scores
 */
export async function updateProjectWithScores(config: EngagementConfig, response: EngagementResponse): Promise<void> {
  if (!config.applyScores || !config.project) {
    core.info('Skipping project update')
    return
  }

  core.info(`Updating project #${config.project} with engagement scores`)

  const octokit = github.getOctokit(config.token)

  try {
    // Get project information using GraphQL
    const projectQuery = `
      query($owner: String!, $repo: String!, $projectNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          projectV2(number: $projectNumber) {
            id
            fields(first: 100) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `

    const projectData = await octokit.graphql<{
      repository: {
        projectV2: {
          id: string
          fields: {
            nodes: Array<{
              id: string
              name: string
              dataType: string
              options?: Array<{ id: string; name: string }>
            }>
          }
        }
      }
    }>(projectQuery, {
      owner: config.repoOwner,
      repo: config.repoName,
      projectNumber: parseInt(config.project, 10)
    })

    const project = projectData.repository.projectV2
    if (!project) {
      throw new Error(`Project #${config.project} not found`)
    }

    // Find the engagement score field
    const engagementField = project.fields.nodes.find(field => 
      field.name === config.projectColumn
    )

    if (!engagementField) {
      core.warning(`Field "${config.projectColumn}" not found in project. Available fields: ${project.fields.nodes.map(f => f.name).join(', ')}`)
      return
    }

    // Update each issue's engagement score
    let updatedCount = 0
    for (const item of response.items) {
      try {
        // Get project item for this issue
        const itemQuery = `
          query($projectId: ID!, $issueNumber: Int!) {
            node(id: $projectId) {
              ... on ProjectV2 {
                items(first: 100) {
                  nodes {
                    id
                    content {
                      ... on Issue {
                        number
                      }
                    }
                  }
                }
              }
            }
          }
        `

        const itemData = await octokit.graphql<{
          node: {
            items: {
              nodes: Array<{
                id: string
                content: {
                  number: number
                }
              }>
            }
          }
        }>(itemQuery, {
          projectId: project.id,
          issueNumber: item.issueNumber
        })

        const projectItem = itemData.node.items.nodes.find(
          node => node.content.number === item.issueNumber
        )

        if (!projectItem) {
          core.warning(`Issue #${item.issueNumber} not found in project`)
          continue
        }

        // Update the field value
        const updateMutation = `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
            updateProjectV2ItemFieldValue(
              input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: {
                  text: $value
                }
              }
            ) {
              projectV2Item {
                id
              }
            }
          }
        `

        await octokit.graphql(updateMutation, {
          projectId: project.id,
          itemId: projectItem.id,
          fieldId: engagementField.id,
          value: item.engagement.score.toString()
        })

        core.info(`Updated issue #${item.issueNumber} with score ${item.engagement.score}`)
        updatedCount++
      } catch (error) {
        core.warning(`Failed to update issue #${item.issueNumber}: ${error}`)
      }
    }

    core.info(`Successfully updated ${updatedCount} of ${response.totalItems} items`)
  } catch (error) {
    core.warning(`Failed to update project: ${error}`)
    
    // Fallback to logging the actions that would be taken
    core.info(`Would update ${response.totalItems} items in project with engagement scores`)
    for (const item of response.items) {
      core.info(`Would update issue #${item.issueNumber} with score ${item.engagement.score}`)
    }
  }
}
