import { jest } from '@jest/globals'
import {
  ContributorRole,
  EngagementWeights,
  RoleBasedWeights,
  UserGroups,
  getWeightForRole,
  normalizeWeights
} from '../../src/engagement/engagement-config.js'
import {
  calculateScoreWithRoles,
  calculateHistoricalScoreWithRoles
} from '../../src/github/issue-details.js'
import { IssueDetails } from '../../src/github/types.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

// Mock the role detection module
jest.mock('../../src/github/role-detection.js')

// Import the mocked functions after mocking
import {
  detectUserRole
} from '../../src/github/role-detection.js'

// Type the mocked functions
const mockDetectUserRole = jest.mocked(detectUserRole)

// Mock the GraphQL SDK
const mockGraphQLSdk = {
  GetUserRepositoryPermission: jest.fn(),
  GetUserOrganizationMembership: jest.fn(),
  GetUserContributionHistory: jest.fn(),
  SearchIssues: jest.fn(),
  SearchPullRequests: jest.fn()
} as any

describe('Role-Based Engagement Scoring', () => {
  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
    inMemoryFs.setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('normalizeWeights', () => {
    it('should convert flat number weights to role-based weights', () => {
      const flatWeights = {
        comments: 3,
        reactions: 1,
        contributors: 2,
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      }

      const result = normalizeWeights(flatWeights)

      expect(result.comments).toEqual({ base: 3 })
      expect(result.reactions).toEqual({ base: 1 })
      expect(result.contributors).toEqual({ base: 2 })
      expect(result.lastActivity).toBe(1)
      expect(result.issueAge).toBe(1)
      expect(result.linkedPullRequests).toBe(2)
    })

    it('should preserve role-based weights', () => {
      const roleWeights = {
        comments: { base: 3, maintainer: 4, partner: 3, firstTime: 5, frequent: 2 },
        reactions: { base: 1, maintainer: 3, partner: 2 },
        contributors: { base: 2, firstTime: 4 },
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      }

      const result = normalizeWeights(roleWeights)

      expect(result.comments).toEqual({ base: 3, maintainer: 4, partner: 3, firstTime: 5, frequent: 2 })
      expect(result.reactions).toEqual({ base: 1, maintainer: 3, partner: 2 })
      expect(result.contributors).toEqual({ base: 2, firstTime: 4 })
    })

    it('should use default values for missing weights', () => {
      const result = normalizeWeights({})

      expect(result.comments).toEqual({ base: 3 })
      expect(result.reactions).toEqual({ base: 1 })
      expect(result.contributors).toEqual({ base: 2 })
      expect(result.lastActivity).toBe(1)
      expect(result.issueAge).toBe(1)
      expect(result.linkedPullRequests).toBe(2)
    })
  })

  describe('getWeightForRole', () => {
    const roleWeights: RoleBasedWeights = {
      base: 3,
      maintainer: 4,
      partner: 3,
      firstTime: 5,
      frequent: 2
    }

    it('should return role-specific weight when available', () => {
      expect(getWeightForRole(roleWeights, ContributorRole.Maintainer)).toBe(4)
      expect(getWeightForRole(roleWeights, ContributorRole.Partner)).toBe(3)
      expect(getWeightForRole(roleWeights, ContributorRole.FirstTime)).toBe(5)
      expect(getWeightForRole(roleWeights, ContributorRole.Frequent)).toBe(2)
    })

    it('should fall back to base weight when role-specific weight is missing', () => {
      const partialWeights: RoleBasedWeights = { base: 3, maintainer: 4 }
      
      expect(getWeightForRole(partialWeights, ContributorRole.Maintainer)).toBe(4)
      expect(getWeightForRole(partialWeights, ContributorRole.Partner)).toBe(3) // falls back to base
      expect(getWeightForRole(partialWeights, ContributorRole.Base)).toBe(3)
    })

    it('should handle flat number weights', () => {
      expect(getWeightForRole(5, ContributorRole.Maintainer)).toBe(5)
      expect(getWeightForRole(5, ContributorRole.Base)).toBe(5)
    })
  })

  describe('detectUserRole', () => {
    const repoInfo = { owner: 'test-owner', name: 'test-repo' }
    const groups: UserGroups = {
      partner: ['partner-user', 'external-collab'],
      internal: ['internal-user']
    }

    it('should use mocked role detection', async () => {
      mockDetectUserRole.mockResolvedValue(ContributorRole.Maintainer)

      const role = await detectUserRole('test-user', repoInfo, groups, mockGraphQLSdk)
      expect(role).toBe(ContributorRole.Maintainer)
      expect(mockDetectUserRole).toHaveBeenCalledWith('test-user', repoInfo, groups, mockGraphQLSdk)
    })

    it('should handle different role types', async () => {
      mockDetectUserRole.mockResolvedValueOnce(ContributorRole.Partner)
      mockDetectUserRole.mockResolvedValueOnce(ContributorRole.FirstTime)
      mockDetectUserRole.mockResolvedValueOnce(ContributorRole.Frequent)

      const role1 = await detectUserRole('partner-user', repoInfo, groups, mockGraphQLSdk)
      const role2 = await detectUserRole('first-time-user', repoInfo, groups, mockGraphQLSdk)
      const role3 = await detectUserRole('frequent-user', repoInfo, groups, mockGraphQLSdk)

      expect(role1).toBe(ContributorRole.Partner)
      expect(role2).toBe(ContributorRole.FirstTime)
      expect(role3).toBe(ContributorRole.Frequent)
    })
  })

  describe('calculateScoreWithRoles', () => {
    const mockIssueDetails: IssueDetails = {
      id: '1',
      owner: 'test-owner',
      repo: 'test-repo',
      number: 123,
      title: 'Test Issue',
      body: 'Test issue body',
      state: 'open',
      createdAt: new Date('2023-01-01T12:00:00Z'),
      updatedAt: new Date('2023-01-08T12:00:00Z'),
      closedAt: null,
      reactions: [
        {
          user: { login: 'maintainer-user', type: 'User' },
          reaction: 'thumbs_up',
          createdAt: new Date('2023-01-02T12:00:00Z')
        }
      ],
      comments: [
        {
          user: { login: 'partner-user', type: 'User' },
          createdAt: new Date('2023-01-02T12:00:00Z'),
          reactions: [
            {
              user: { login: 'first-time-user', type: 'User' },
              reaction: 'heart',
              createdAt: new Date('2023-01-02T13:00:00Z')
            }
          ]
        }
      ],
      user: { login: 'frequent-user', type: 'User' },
      assignees: []
    }

    const roleWeights: EngagementWeights = {
      comments: { base: 3, maintainer: 4, partner: 5, firstTime: 6, frequent: 2 },
      reactions: { base: 1, maintainer: 3, partner: 2, firstTime: 4, frequent: 1 },
      contributors: { base: 2, maintainer: 2, partner: 3, firstTime: 5, frequent: 2 },
      lastActivity: 1,
      issueAge: 1,
      linkedPullRequests: 2
    }

    const groups: UserGroups = {
      partner: ['partner-user'],
      internal: []
    }

    beforeEach(() => {
      // Mock role detection results
      mockDetectUserRole.mockImplementation(async (username) => {
        switch (username) {
          case 'maintainer-user':
            return ContributorRole.Maintainer
          case 'partner-user':
            return ContributorRole.Partner
          case 'first-time-user':
            return ContributorRole.FirstTime
          case 'frequent-user':
            return ContributorRole.Frequent
          default:
            return ContributorRole.Base
        }
      })
    })

    it('should calculate score using role-based weights', async () => {
      const score = await calculateScoreWithRoles(mockIssueDetails, roleWeights, groups, mockGraphQLSdk)

      // Expected calculation:
      // Comments: 5 (partner-user comment)
      // Reactions: 3 (maintainer-user reaction) + 4 (first-time-user comment reaction) = 7
      // Contributors: 2 (frequent-user author) + 3 (partner-user commenter) + 5 (first-time-user reactor) = 10
      // Time factors: 1 * (1/2) + 1 * (1/9) = 0.5 + 0.111 = 0.611
      // Total: 5 + 7 + 10 + 0.611 = 22.611, rounded = 23

      expect(score).toBe(23)
    })

    it('should handle issues with no role-based activity', async () => {
      const simpleIssue: IssueDetails = {
        ...mockIssueDetails,
        comments: [],
        reactions: [],
        user: { login: 'simple-user', type: 'User' }
      }

      mockDetectUserRole.mockResolvedValue(ContributorRole.Base)

      const score = await calculateScoreWithRoles(simpleIssue, roleWeights, groups, mockGraphQLSdk)

      // Only contributor score (base role) + time factors
      expect(score).toBeGreaterThan(0)
    })

    it('should handle mixed role-based and flat weights', async () => {
      const mixedWeights: EngagementWeights = {
        comments: 5, // flat number
        reactions: { base: 1, maintainer: 3 }, // role-based
        contributors: { base: 2, partner: 4 }, // role-based
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      }

      const score = await calculateScoreWithRoles(mockIssueDetails, mixedWeights, groups, mockGraphQLSdk)

      expect(score).toBeGreaterThan(0)
    })
  })

  describe('calculateHistoricalScoreWithRoles', () => {
    it('should calculate historical score with role-based weights', async () => {
      const mockIssueDetails: IssueDetails = {
        id: '1',
        owner: 'test-owner',
        repo: 'test-repo',
        number: 123,
        title: 'Test Issue',
        body: 'Test issue body',
        state: 'open',
        createdAt: new Date('2023-01-01T12:00:00Z'),
        updatedAt: new Date('2023-01-08T12:00:00Z'),
        closedAt: null,
        reactions: [],
        comments: [],
        user: { login: 'test-user', type: 'User' },
        assignees: []
      }

      const roleWeights: EngagementWeights = {
        comments: { base: 3 },
        reactions: { base: 1 },
        contributors: { base: 2 },
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      }

      mockDetectUserRole.mockResolvedValue(ContributorRole.Base)

      const historicalScore = await calculateHistoricalScoreWithRoles(
        mockIssueDetails,
        roleWeights,
        undefined,
        mockGraphQLSdk
      )

      expect(historicalScore).toBeGreaterThanOrEqual(0)
      expect(typeof historicalScore).toBe('number')
    })
  })
})