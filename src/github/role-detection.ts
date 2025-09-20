import { Sdk as GraphQLSdk } from '../generated/graphql.js'
import { ContributorRole, UserGroups } from '../engagement/engagement-config.js'
import * as core from '@actions/core'

/**
 * Cache for user role detection to avoid repeated API calls
 */
const roleCache = new Map<string, ContributorRole>()

/**
 * Cache for user permissions to avoid repeated API calls
 */
const permissionsCache = new Map<string, string>()

/**
 * Cache for user contribution history to avoid repeated API calls
 */
const contributionHistoryCache = new Map<string, number>()

/**
 * User contribution activity data
 */
export interface UserActivity {
  issueContributions: number
  pullRequestContributions: number
  commitContributions: number
  totalContributions: number
}

/**
 * Repository information for role detection
 */
export interface RepoInfo {
  owner: string
  name: string
}

/**
 * Detect the role of a user for scoring purposes
 * @param username - The username to check
 * @param repoInfo - Repository information
 * @param groups - User groups configuration
 * @param graphql - GraphQL SDK instance
 * @returns Promise<ContributorRole> - The detected role
 */
export async function detectUserRole(
  username: string,
  repoInfo: RepoInfo,
  groups: UserGroups | undefined,
  graphql: GraphQLSdk
): Promise<ContributorRole> {
  const cacheKey = `${username}:${repoInfo.owner}:${repoInfo.name}`

  // Check cache first
  if (roleCache.has(cacheKey)) {
    return roleCache.get(cacheKey)!
  }

  let role = ContributorRole.Base

  try {
    // Check if user is a maintainer (has write/admin access or is in org)
    if (await isMaintainer(username, repoInfo, graphql)) {
      role = ContributorRole.Maintainer
    }
    // Check if user is in partner group
    else if (isPartner(username, groups)) {
      role = ContributorRole.Partner
    }
    // Check if user is a frequent contributor
    else if (await isFrequentContributor(username, repoInfo, graphql)) {
      role = ContributorRole.Frequent
    }
    // Check if this is user's first contribution to the repo
    else if (await isFirstTimeContributor(username, repoInfo, graphql)) {
      role = ContributorRole.FirstTime
    }

    // Cache the result
    roleCache.set(cacheKey, role)

    core.debug(`Detected role for user ${username}: ${role}`)
  } catch (error) {
    core.warning(`Failed to detect role for user ${username}: ${error}`)
    // Fall back to base role
    role = ContributorRole.Base
  }

  return role
}

/**
 * Check if user is a maintainer (has write/admin access to repository)
 */
async function isMaintainer(username: string, repoInfo: RepoInfo, graphql: GraphQLSdk): Promise<boolean> {
  const cacheKey = `${username}:${repoInfo.owner}:${repoInfo.name}:permission`

  if (permissionsCache.has(cacheKey)) {
    const permission = permissionsCache.get(cacheKey)!
    return permission === 'ADMIN' || permission === 'WRITE'
  }

  try {
    // Query repository collaborators to find user's permission level
    const result = await graphql.GetUserRepositoryPermission({
      owner: repoInfo.owner,
      name: repoInfo.name,
      login: username
    })

    const collaboratorEdge = result.repository?.collaborators?.edges?.find(
      (edge: any) => edge?.node?.login === username
    )

    if (collaboratorEdge?.permission) {
      const permission = collaboratorEdge.permission
      permissionsCache.set(cacheKey, permission)
      return permission === 'ADMIN' || permission === 'WRITE'
    }

    // If not found in collaborators, check if user is in organization
    const orgResult = await graphql.GetUserOrganizationMembership({
      organization: repoInfo.owner,
      login: username
    })

    const isMember = orgResult.organization?.membersWithRole?.nodes?.some((node: any) => node?.login === username)

    if (isMember) {
      permissionsCache.set(cacheKey, 'ORG_MEMBER')
      return true
    }

    permissionsCache.set(cacheKey, 'READ')
    return false
  } catch (error) {
    core.debug(`Failed to check maintainer status for ${username}: ${error}`)
    return false
  }
}

/**
 * Check if user is in partner group
 */
function isPartner(username: string, groups: UserGroups | undefined): boolean {
  return groups?.partner?.includes(username) ?? false
}

/**
 * Check if user is a frequent contributor (≥3 contributions in last 90 days)
 */
async function isFrequentContributor(username: string, repoInfo: RepoInfo, graphql: GraphQLSdk): Promise<boolean> {
  const cacheKey = `${username}:${repoInfo.owner}:${repoInfo.name}:contributions`

  if (contributionHistoryCache.has(cacheKey)) {
    return contributionHistoryCache.get(cacheKey)! >= 3
  }

  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const result = await graphql.GetUserContributionHistory({
      login: username,
      from: ninetyDaysAgo.toISOString(),
      to: new Date().toISOString()
    })

    const contributions = result.user?.contributionsCollection
    const totalContributions =
      (contributions?.issueContributions?.totalCount ?? 0) +
      (contributions?.pullRequestContributions?.totalCount ?? 0) +
      (contributions?.totalCommitContributions ?? 0)

    contributionHistoryCache.set(cacheKey, totalContributions)
    return totalContributions >= 3
  } catch (error) {
    core.debug(`Failed to check contribution history for ${username}: ${error}`)
    return false
  }
}

/**
 * Check if this is user's first contribution to the repository
 */
async function isFirstTimeContributor(username: string, repoInfo: RepoInfo, graphql: GraphQLSdk): Promise<boolean> {
  try {
    // Check if user has any previous issues, PRs, or comments in this repo
    const searchQuery = `author:${username} repo:${repoInfo.owner}/${repoInfo.name}`

    const issuesResult = await graphql.SearchIssues({
      query: searchQuery,
      first: 1
    })

    const pullRequestsResult = await graphql.SearchPullRequests({
      query: `is:pr ${searchQuery}`,
      first: 1
    })

    const hasIssues = (issuesResult.search?.issueCount ?? 0) > 0
    const hasPullRequests = (pullRequestsResult.search?.issueCount ?? 0) > 0

    // If no issues or PRs, this is likely a first-time contributor
    return !hasIssues && !hasPullRequests
  } catch (error) {
    core.debug(`Failed to check first-time contributor status for ${username}: ${error}`)
    return false
  }
}

/**
 * Clear caches (useful for testing)
 */
export function clearRoleDetectionCaches(): void {
  roleCache.clear()
  permissionsCache.clear()
  contributionHistoryCache.clear()
}
