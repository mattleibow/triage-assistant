import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import * as utils from './utils.js'

/**
 * Configuration interface for engagement scoring weights
 */
export interface ConfigFileEngagementWeights {
  comments: number
  reactions: number
  contributors: number
  lastActivity: number
  issueAge: number
  linkedPullRequests: number
}

/**
 * Configuration interface for batch label processing
 */
export interface ConfigFileEngagement {
  weights: ConfigFileEngagementWeights
}

/**
 * Configuration interface for a single label group
 */
export interface ConfigFileLabelGroup {
  /** Label prefix for searching (e.g., 'area-', 'platform-') */
  labelPrefix?: string
  /** Template to use for this label group */
  template: string
  /** Specific label to use (for regression type) */
  label?: string
  /** Multiple specific labels to choose from (e.g., for missing-info type) */
  labels?: string[]
}

/**
 * Configuration interface for batch label processing
 */
export interface ConfigFileLabels {
  groups: Record<string, ConfigFileLabelGroup>
}

/**
 * Configuration interface for the .triagerc.yml file
 */
export interface ConfigFile {
  engagement: ConfigFileEngagement
  labels: ConfigFileLabels
}

/**
 * Default engagement weights that match the current hardcoded values
 */
export const DEFAULT_ENGAGEMENT_WEIGHTS: ConfigFileEngagementWeights = {
  comments: 3,
  reactions: 1,
  contributors: 2,
  lastActivity: 1,
  issueAge: 1,
  linkedPullRequests: 2
}

/**
 * Load full triage configuration from .triagerc.yml or .github/.triagerc.yml
 * @param workspacePath - The workspace path to search for config files
 * @returns The full configuration object
 */
export async function loadConfigFile(workspacePath: string = '.'): Promise<ConfigFile> {
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

  const config = await loadFile(configPaths)

  // Log final config
  core.info(`Using complete configuration: ${JSON.stringify(config)}`)

  return config
}

export async function loadFile(configPaths: string[]): Promise<ConfigFile> {
  const failedPaths: Map<string, string> = new Map()

  for (const configPath of configPaths) {
    try {
      core.info(`Attempting to load triage configuration from ${configPath}`)
      const fileContent = await fs.promises.readFile(configPath, 'utf8')
      const parsedConfig = parseConfigFile(fileContent)
      if (parsedConfig) {
        core.info(`Successfully loaded configuration from ${configPath}: ${JSON.stringify(parsedConfig)}`)
        return parsedConfig
      }
    } catch (error) {
      failedPaths.set(configPath, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Log failed lookup
  if (failedPaths.size > 0) {
    const details = Array.from(failedPaths.entries())
      .map(([configPath, errorMessage]) => ` - ${configPath}: ${errorMessage}`)
      .join('\n')
    core.warning(`Failed to load configuration from the following paths:\n${details}`)
  }

  // Nothing was loaded, so we got an empty config file
  return {
    engagement: {
      weights: { ...DEFAULT_ENGAGEMENT_WEIGHTS }
    },
    labels: {
      groups: {}
    }
  }
}

export function parseConfigFile(fileContent: string): ConfigFile | undefined {
  const parsedConfig = yaml.load(fileContent) as Partial<ConfigFile> | undefined

  // We successfully loaded a configuration
  if (!parsedConfig || typeof parsedConfig !== 'object') {
    return undefined
  }

  // Make sure the config is normalized
  const normalized: ConfigFile = {
    ...parsedConfig,
    engagement: {
      ...parsedConfig.engagement,
      weights: {
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        ...(parsedConfig.engagement?.weights ?? {})
      }
    },
    labels: {
      ...parsedConfig.labels,
      groups: parsedConfig.labels?.groups ?? {}
    }
  }

  return normalized
}
