import { jest } from '@jest/globals'
import {
  ContributorRole,
  EngagementWeights,
  RoleBasedWeights,
  UserGroups,
  getWeightForRole,
  normalizeWeights
} from '../../src/engagement/engagement-config.js'
import { IssueDetails } from '../../src/github/types.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

describe('Role-Based Engagement Configuration', () => {
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

  describe('ContributorRole enum', () => {
    it('should have all expected role values', () => {
      expect(ContributorRole.Base).toBe('base')
      expect(ContributorRole.Maintainer).toBe('maintainer')
      expect(ContributorRole.Partner).toBe('partner')
      expect(ContributorRole.FirstTime).toBe('firstTime')
      expect(ContributorRole.Frequent).toBe('frequent')
    })
  })

  describe('RoleBasedWeights interface', () => {
    it('should support partial role definitions', () => {
      const partialWeights: RoleBasedWeights = {
        base: 3,
        maintainer: 4
        // Other roles undefined, should fall back to base
      }

      expect(partialWeights.base).toBe(3)
      expect(partialWeights.maintainer).toBe(4)
      expect(partialWeights.partner).toBeUndefined()
    })

    it('should support complete role definitions', () => {
      const completeWeights: RoleBasedWeights = {
        base: 3,
        maintainer: 4,
        partner: 3,
        firstTime: 5,
        frequent: 2
      }

      expect(completeWeights.base).toBe(3)
      expect(completeWeights.maintainer).toBe(4)
      expect(completeWeights.partner).toBe(3)
      expect(completeWeights.firstTime).toBe(5)
      expect(completeWeights.frequent).toBe(2)
    })
  })

  describe('UserGroups interface', () => {
    it('should support partner and internal groups', () => {
      const groups: UserGroups = {
        partner: ['user1', 'user2'],
        internal: ['admin1', 'admin2']
      }

      expect(groups.partner).toEqual(['user1', 'user2'])
      expect(groups.internal).toEqual(['admin1', 'admin2'])
    })

    it('should support optional groups', () => {
      const groups1: UserGroups = {
        partner: ['user1']
        // internal is optional
      }

      const groups2: UserGroups = {
        internal: ['admin1']
        // partner is optional
      }

      expect(groups1.partner).toEqual(['user1'])
      expect(groups1.internal).toBeUndefined()
      expect(groups2.internal).toEqual(['admin1'])
      expect(groups2.partner).toBeUndefined()
    })
  })
})
