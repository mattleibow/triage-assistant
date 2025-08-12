import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import * as utils from '../utils.js'

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
    utils.safePath(normalizedWorkspace, '.triagerc.yml'),
    utils.safePath(normalizedWorkspace, '.github/.triagerc.yml')
  ]

  let config: TriageConfig = {}

  const failedPaths: Map<string, string> = new Map()
  for (const configPath of configPaths) {
    try {
      core.info(`Attempting to load triage configuration from ${configPath}`)
      const fileContent = await fs.promises.readFile(configPath, 'utf8')
      
      // Use safe YAML loading to prevent deserialization attacks
      const parsedConfig = yaml.load(fileContent, {
        schema: yaml.CORE_SCHEMA, // Use core schema instead of default (more restrictive)
        json: false,              // Disable JSON parsing features
        onWarning: (warning) => {
          core.warning(`YAML parsing warning in ${configPath}: ${warning.message}`)
        }
      }) as TriageConfig

      if (parsedConfig && typeof parsedConfig === 'object') {
        config = parsedConfig
        failedPaths.clear()
        core.info(`Successfully loaded configuration from ${configPath}`)
        break
      }
    } catch (error) {
      failedPaths.set(configPath, error instanceof Error ? error.message : 'Unknown error')
    }
  }
  if (failedPaths.size > 0) {
    const details = Array.from(failedPaths.entries())
      .map(([configPath, errorMessage]) => ` - ${configPath}: ${errorMessage}`)
      .join('\n')
    core.warning(`Failed to load configuration from the following paths:\n${details}`)
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
