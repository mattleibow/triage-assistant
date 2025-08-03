import * as core from '@actions/core'
import { GraphQLClient } from 'graphql-request'
import { getSdk, Sdk as GraphQLSdk } from '../generated/graphql.js'
import { EngagementResponse } from '../engagement/engagement-types.js'
import { EngagementConfig, TriageConfig } from '../config.js'

/**
 * Get all items from a project
 */
export async function getAllProjectItems(
  sdk: GraphQLSdk,
  owner: string,
  repo: string,
  projectNumber: number
): Promise<
  Array<{ id: string; projectId: string; content?: { type: string; owner: string; repo: string; number: number } }>
> {
  core.info(`Fetching all items from project #${projectNumber}`)

  let hasNextPage = true
  let cursor: string | null = null
  const allItems: Array<{
    id: string
    projectId: string
    content?: { type: string; owner: string; repo: string; number: number }
  }> = []

  while (hasNextPage) {
    const result = await sdk.GetProjectItems({
      owner,
      repo,
      projectNumber,
      cursor
    })

    const projectData = result.repository?.projectV2
    if (!projectData) {
      throw new Error(`Project #${projectNumber} not found`)
    }

    const projectId = projectData.id
    const items = projectData.items.nodes || []

    for (const item of items) {
      if (item?.content && 'number' in item.content && item.content.number) {
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
    cursor = projectData.items.pageInfo.endCursor || null
  }

  return allItems
}

/**
 * Update project field with engagement scores
 */
export async function updateProjectWithScores(
  config: EngagementConfig & TriageConfig,
  response: EngagementResponse
): Promise<void> {
  if (!config.applyScores || !config.projectNumber) {
    core.info('Skipping project update')
    return
  }

  core.info(`Updating project #${config.projectNumber} with engagement scores`)

  // Create GraphQL SDK
  const graphql = new GraphQLClient('https://api.github.com/graphql', {
    headers: {
      Authorization: `Bearer ${config.token}`
    }
  })
  const sdk = getSdk(graphql)

  const projectField = await getProjectField(
    sdk,
    config.repoOwner,
    config.repoName,
    config.projectNumber,
    config.projectColumn
  )

  if (!projectField) {
    core.warning(`Field "${config.projectColumn}" not found in project`)
    return
  }

  // Get the project ID for the mutation
  const projectItems = await getAllProjectItems(sdk, config.repoOwner, config.repoName, config.projectNumber)

  const projectId = projectItems.length > 0 ? projectItems[0].projectId : null
  if (!projectId) {
    core.warning('No project items found or unable to determine project ID')
    return
  }

  // Update each issue's engagement score
  let updatedCount = 0
  for (const item of response.items) {
    if (item.id) {
      try {
        await updateProjectItem(sdk, config, item.id, projectField.id, projectId, item.engagement.score.toString())
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
  sdk: GraphQLSdk,
  owner: string,
  repo: string,
  projectNumber: number,
  fieldName: string
): Promise<{ id: string; name: string } | null> {
  const result = await sdk.GetProjectField({
    owner,
    repo,
    projectNumber
  })

  const project = result.repository?.projectV2
  if (!project) {
    return null
  }

  const field = project.fields.nodes?.find((f) => {
    // Check if it's a ProjectV2Field (which has name and id)
    return f?.__typename === 'ProjectV2Field' && f?.name === fieldName
  })

  if (!field || field.__typename !== 'ProjectV2Field') {
    return null
  }

  return { id: field.id, name: field.name }
}

/**
 * Update a project item field
 */
export async function updateProjectItem(
  sdk: GraphQLSdk,
  config: EngagementConfig & TriageConfig,
  itemId: string,
  fieldId: string,
  projectId: string,
  value: string
): Promise<void> {
  if (config.dryRun) {
    core.info(`Dry run: Skipping updating project item ${itemId} field ${fieldId} with value "${value}"`)
    return
  }

  await sdk.UpdateProjectItemField({
    itemId,
    fieldId,
    projectId,
    value
  })
}
