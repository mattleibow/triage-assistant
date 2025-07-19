import * as core from '@actions/core'
import * as github from '@actions/github'
import { EngagementResponse } from '../engagement/engagement-types.js'
import { EngagementConfig } from '../config.js'

type Octokit = ReturnType<typeof github.getOctokit>

/**
 * Get all items from a project
 */
export async function getAllProjectItems(
  octokit: Octokit,
  owner: string,
  repo: string,
  projectNumber: number
): Promise<
  Array<{ id: string; projectId: string; content?: { type: string; owner: string; repo: string; number: number } }>
> {
  const query = `
    query($owner: String!, $repo: String!, $projectNumber: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        projectV2(number: $projectNumber) {
          id
          items(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              content {
                ... on Issue {
                  number
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  let hasNextPage = true
  let cursor: string | null = null
  const allItems: Array<{
    id: string
    projectId: string
    content?: { type: string; owner: string; repo: string; number: number }
  }> = []

  while (hasNextPage) {
    const result: {
      repository: {
        projectV2: {
          id: string
          items: {
            pageInfo: {
              hasNextPage: boolean
              endCursor: string
            }
            nodes: Array<{
              id: string
              content?: {
                number: number
                repository: {
                  name: string
                  owner: {
                    login: string
                  }
                }
              }
            }>
          }
        }
      }
    } = await octokit.graphql(query, {
      owner,
      repo,
      projectNumber,
      cursor
    })

    const projectData = result.repository.projectV2
    if (!projectData) {
      throw new Error(`Project #${projectNumber} not found`)
    }

    const projectId = projectData.id
    const items = projectData.items.nodes

    for (const item of items) {
      if (item.content && item.content.number) {
        allItems.push({
          id: item.id,
          projectId,
          content: {
            type: 'issue',
            owner: item.content.repository.owner.login,
            repo: item.content.repository.name,
            number: item.content.number
          }
        })
      }
    }

    hasNextPage = projectData.items.pageInfo.hasNextPage
    cursor = projectData.items.pageInfo.endCursor
  }

  return allItems
}

/**
 * Update project field with engagement scores
 */
export async function updateProjectWithScores(
  config: EngagementConfig,
  response: EngagementResponse,
  octokit: Octokit
): Promise<void> {
  if (!config.applyScores || !config.projectNumber) {
    core.info('Skipping project update')
    return
  }

  core.info(`Updating project #${config.projectNumber} with engagement scores`)

  const projectField = await getProjectField(
    octokit,
    config.repoOwner,
    config.repoName,
    config.projectNumber,
    config.projectColumn
  )

  if (!projectField) {
    core.warning(`Field "${config.projectColumn}" not found in project`)
    return
  }

  // Update each issue's engagement score
  let updatedCount = 0
  for (const item of response.items) {
    if (item.id) {
      try {
        await updateProjectItem(octokit, item.id, projectField.id, item.engagement.score.toString())
        updatedCount++
      } catch (error) {
        core.warning(`Failed to update item ${item.id}: ${error}`)
      }
    }
  }

  core.info(`Updated ${updatedCount} project items with engagement scores`)
}

/**
 * Get project field information
 */
export async function getProjectField(
  octokit: Octokit,
  owner: string,
  repo: string,
  projectNumber: number,
  fieldName: string
): Promise<{ id: string; name: string } | null> {
  const query = `
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
            }
          }
        }
      }
    }
  `

  const result: {
    repository: {
      projectV2: {
        id: string
        fields: {
          nodes: Array<{
            id: string
            name: string
            dataType: string
          }>
        }
      }
    }
  } = await octokit.graphql(query, {
    owner,
    repo,
    projectNumber
  })

  const project = result.repository.projectV2
  if (!project) {
    return null
  }

  const field = project.fields.nodes.find((f: { name: string }) => f.name === fieldName)
  if (!field) {
    return null
  }

  return { id: field.id, name: field.name }
}

/**
 * Update a project item field
 */
export async function updateProjectItem(
  octokit: Octokit,
  itemId: string,
  fieldId: string,
  value: string
): Promise<void> {
  const mutation = `
    mutation($itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(input: {
        itemId: $itemId
        fieldId: $fieldId
        value: {
          text: $value
        }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `

  await octokit.graphql(mutation, {
    itemId,
    fieldId,
    value
  })
}
