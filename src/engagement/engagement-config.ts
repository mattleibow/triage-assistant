/**
 * Configuration module for role-based engagement scoring
 */

/**
 * Role types for contributors
 */
export enum ContributorRole {
  Base = 'base',
  Maintainer = 'maintainer',
  Partner = 'partner',
  FirstTime = 'firstTime',
  Frequent = 'frequent'
}

/**
 * Role-based weights for a specific engagement factor
 */
export interface RoleBasedWeights {
  base: number
  maintainer?: number
  partner?: number
  firstTime?: number
  frequent?: number
}

/**
 * User groups configuration
 */
export interface UserGroups {
  partner?: string[]
  internal?: string[]
}

/**
 * Extended engagement weights with role-based support
 */
export interface EngagementWeights {
  comments: number | RoleBasedWeights
  reactions: number | RoleBasedWeights
  contributors: number | RoleBasedWeights
  lastActivity: number
  issueAge: number
  linkedPullRequests: number
}

/**
 * Configuration for engagement scoring with user groups
 */
export interface EngagementConfig {
  weights: EngagementWeights
  groups?: UserGroups
}

/**
 * Get the weight for a specific role and factor
 * @param weights - The weight configuration (number or RoleBasedWeights)
 * @param role - The contributor role
 * @returns The weight value to use
 */
export function getWeightForRole(weights: number | RoleBasedWeights, role: ContributorRole): number {
  if (typeof weights === 'number') {
    return weights
  }

  // Return role-specific weight or fall back to base
  return weights[role] ?? weights.base
}

/**
 * Normalize weight configuration to support both legacy and new formats
 * @param weights - Raw weight configuration
 * @returns Normalized EngagementWeights
 */
export function normalizeWeights(weights: any): EngagementWeights {
  const normalized: EngagementWeights = {
    comments: weights.comments ?? 3,
    reactions: weights.reactions ?? 1,
    contributors: weights.contributors ?? 2,
    lastActivity: weights.lastActivity ?? 1,
    issueAge: weights.issueAge ?? 1,
    linkedPullRequests: weights.linkedPullRequests ?? 2
  }

  // Convert simple numbers to role-based weights with base value
  for (const key of ['comments', 'reactions', 'contributors'] as const) {
    const value = normalized[key]
    if (typeof value === 'number') {
      normalized[key] = { base: value }
    }
  }

  return normalized
}