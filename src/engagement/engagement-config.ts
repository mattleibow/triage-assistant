import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import * as yaml from 'js-yaml'

/**
 * Configuration interface for engagement scoring weights
 */
export interface EngagementWeights {
  comments: number
  reactions: number
  contributors: number
  lastActivity: number
  issueAge: number
  linkedPullRequests: number
}

/**
 * Configuration interface for the .triagerc.yml file
 */
export interface TriageConfig {
  engagement?: {
    weights?: Partial<EngagementWeights>
  }
}

/**
 * Default engagement weights that match the current hardcoded values
 */
export const DEFAULT_ENGAGEMENT_WEIGHTS: EngagementWeights = {
  comments: 3,
  reactions: 1,
  contributors: 2,
  lastActivity: 1,
  issueAge: 1,
  linkedPullRequests: 2
}

/**
 * Safely resolves and validates a config file path to prevent path traversal attacks
 * @param basePath The base workspace path
 * @param relativePath The relative path to the config file
 * @returns The resolved and validated absolute path
 */
function safeConfigPath(basePath: string, relativePath: string): string {
  const resolved = path.resolve(basePath, relativePath)
  const normalizedBase = path.resolve(basePath)
  
  // Ensure the resolved path is within the base directory
  // Use path.relative to check if we need to traverse up from base to reach resolved
  const relative = path.relative(normalizedBase, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Invalid config path: ${relativePath} resolves outside workspace`)
  }
  
  return resolved
}

/**
 * Load triage configuration from .triagerc.yml or .github/.triagerc.yml
 * @param workspacePath - The workspace path to search for config files
 * @returns Combined configuration with defaults applied
 */
export async function loadTriageConfig(workspacePath: string = '.'): Promise<EngagementWeights> {
  // Validate and normalize workspace path to prevent directory traversal
  const currentDir = process.cwd()
  const normalizedWorkspace = path.resolve(workspacePath)
  
  // Ensure workspace path is within or at the current working directory
  const relativeToCurrentDir = path.relative(currentDir, normalizedWorkspace)
  if (relativeToCurrentDir.startsWith('..') || path.isAbsolute(relativeToCurrentDir)) {
    throw new Error(`Invalid workspace path: ${workspacePath} resolves outside current directory`)
  }
  
  const configPaths = [
    safeConfigPath(normalizedWorkspace, '.triagerc.yml'),
    safeConfigPath(normalizedWorkspace, '.github/.triagerc.yml')
  ]

  let config: TriageConfig = {}

  for (const configPath of configPaths) {
    try {
      core.info(`Loading triage configuration from ${configPath}`)
      const fileContent = await fs.promises.readFile(configPath, 'utf8')
      const parsedConfig = yaml.load(fileContent) as TriageConfig

      if (parsedConfig && typeof parsedConfig === 'object') {
        config = parsedConfig
        core.info(`Successfully loaded configuration from ${configPath}`)
        break
      }
    } catch (error) {
      core.warning(
        `Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Merge with defaults
  const weights = config.engagement?.weights || {}
  const mergedWeights: EngagementWeights = {
    comments: weights.comments ?? DEFAULT_ENGAGEMENT_WEIGHTS.comments,
    reactions: weights.reactions ?? DEFAULT_ENGAGEMENT_WEIGHTS.reactions,
    contributors: weights.contributors ?? DEFAULT_ENGAGEMENT_WEIGHTS.contributors,
    lastActivity: weights.lastActivity ?? DEFAULT_ENGAGEMENT_WEIGHTS.lastActivity,
    issueAge: weights.issueAge ?? DEFAULT_ENGAGEMENT_WEIGHTS.issueAge,
    linkedPullRequests: weights.linkedPullRequests ?? DEFAULT_ENGAGEMENT_WEIGHTS.linkedPullRequests
  }

  core.info(`Using engagement weights: ${JSON.stringify(mergedWeights)}`)
  return mergedWeights
}
