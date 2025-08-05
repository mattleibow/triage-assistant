import * as core from '@actions/core'
import { GetProjectItemsQuery, Sdk as GraphQLSdk } from '../generated/graphql.js'
import { EngagementResponse } from '../engagement/engagement-types.js'
import { EngagementConfig, TriageConfig } from '../config.js'
import { ProjectDetails, ProjectItem } from './types.js'

type GetProjectItemsQueryProjectItem = NonNullable<
  NonNullable<GetProjectItemsQuery['repository']>['projectV2']
>['items']

/**
 * Update project field with engagement scores
 */
export async function updateProjectWithScores(
  config: EngagementConfig & TriageConfig,
  graphql: GraphQLSdk,
  response: EngagementResponse
): Promise<void> {
  if (!config.applyScores || !config.projectNumber) {
    core.info('Skipping project update')
    return
  }

  core.info(`Updating project #${config.projectNumber} with engagement scores`)

  const projectField = await getProjectField(
    graphql,
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
  const project = await getProjectDetails(graphql, config.repoOwner, config.repoName, config.projectNumber)

  if (!project || !project.items || project.items.length === 0) {
    core.warning('No project items found or unable to determine project ID')
    return
  }

  // Update each issue's engagement score
  let updatedCount = 0
  for (const item of response.items) {
    if (item.id) {
      try {
        await updateProjectItem(graphql, config, item.id, projectField.id, project.id, item.engagement.score.toString())
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
  graphql: GraphQLSdk,
  owner: string,
  repo: string,
  projectNumber: number,
  fieldName: string
): Promise<{ id: string; name: string } | null> {
  const result = await graphql.GetProjectFields({
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
 * Get all items from a project
 */
export async function getProjectDetails(
  graphql: GraphQLSdk,
  owner: string,
  repo: string,
  projectNumber: number
): Promise<ProjectDetails> {
  core.info(`Fetching all items from project #${projectNumber}`)

  const result = await graphql.GetProjectItems({
    owner,
    repo,
    projectNumber,
    cursor: null
  })

  const projectData = result.repository?.projectV2
  if (!projectData) {
    throw new Error(`Project #${projectNumber} not found`)
  }

  // Create the project object
  const project: ProjectDetails = {
    id: projectData.id,
    owner,
    number: projectNumber,
    items: []
  }

  // Add first batch of items
  let cursor = addItems(projectData.items, project.items, projectData.id)

  // Paginate through remaining items
  while (cursor) {
    const nextResult = await graphql.GetProjectItems({
      owner,
      repo,
      projectNumber,
      cursor
    })

    cursor = addItems(nextResult?.repository?.projectV2?.items, project.items, projectData.id)
  }

  return project
}

/**
 * Update a project item field
 */
export async function updateProjectItem(
  graphql: GraphQLSdk,
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

  await graphql.UpdateProjectItemField({
    itemId,
    fieldId,
    projectId,
    value
  })
}

function addItems(
  items: GetProjectItemsQueryProjectItem | undefined,
  allItems: ProjectItem[],
  projectId: string
): string | null | undefined {
  if (!items?.nodes) {
    return null
  }

  items.nodes.forEach((item) => {
    if (!item) {
      return
    }

    // TODO: add other item types
    if (item?.content?.__typename !== 'Issue') {
      return
    }

    allItems.push({
      id: item.id,
      projectId: projectId,
      type: item.content.__typename,
      content: {
        id: item.content.id,
        owner: item.content.repository.owner.login,
        repo: item.content.repository.name,
        number: item.content.number
      }
    })
  })

  if (!items.pageInfo.hasNextPage) {
    return null
  }

  return items.pageInfo.endCursor
}
