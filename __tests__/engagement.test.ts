import { jest } from '@jest/globals'
import { calculateScore, getUniqueContributors, getTimeSinceLastActivity, getIssueAge, calculatePreviousScore, calculateEngagementScores, updateProjectWithScores } from '../src/engagement.js'
import { IssueDetails } from '../src/engagement-types.js'
import { EngagementConfig } from '../src/triage-config.js'

// Mock GitHub API
const mockOctokit = {
  rest: {
    issues: {
      get: jest.fn(),
      listComments: jest.fn()
    }
  },
  graphql: jest.fn()
} as any

// Mock @actions/github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => mockOctokit)
}))

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn()
}))

describe('Engagement Scoring', () => {
  describe('calculateScore', () => {
    it('should calculate score based on algorithm components', () => {
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        comments: 5,
        reactions: {
          total_count: 3,
          '+1': 2,
          '-1': 0,
          laugh: 1,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0
        },
        comments_data: [
          {
            id: 1,
            user: { login: 'user1', id: 1, type: 'User' },
            created_at: '2023-01-01T12:00:00Z',
            reactions: { total_count: 2, '+1': 1, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 1, rocket: 0, eyes: 0 }
          }
        ],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: [{ login: 'assignee1', id: 200, type: 'User' }]
      }

      const score = calculateScore(mockIssue)
      
      // Verify score is calculated correctly
      expect(score).toBeGreaterThan(0)
      expect(typeof score).toBe('number')
    })

    it('should handle issue with no comments or reactions', () => {
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 0,
        reactions: {
          total_count: 0,
          '+1': 0,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0
        },
        comments_data: [],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: []
      }

      const score = calculateScore(mockIssue)
      
      // Should still calculate a score based on contributor and time factors
      expect(score).toBeGreaterThan(0)
    })

    it('should use correct weights for different components', () => {
      const baseIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 0,
        reactions: {
          total_count: 0,
          '+1': 0,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0
        },
        comments_data: [],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: []
      }

      // Test with comments (weight = 3)
      const issueWithComments = { ...baseIssue, comments: 1 }
      const scoreWithComments = calculateScore(issueWithComments)
      
      // Test with reactions (weight = 1)
      const issueWithReactions = { ...baseIssue, reactions: { ...baseIssue.reactions, total_count: 1 } }
      const scoreWithReactions = calculateScore(issueWithReactions)
      
      // Comments should have higher impact than reactions
      expect(scoreWithComments).toBeGreaterThan(scoreWithReactions)
    })
  })

  describe('getUniqueContributors', () => {
    it('should count unique contributors correctly', () => {
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 2,
        reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
        comments_data: [
          {
            id: 1,
            user: { login: 'user1', id: 1, type: 'User' },
            created_at: '2023-01-01T12:00:00Z',
            reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 }
          },
          {
            id: 2,
            user: { login: 'user2', id: 2, type: 'User' },
            created_at: '2023-01-01T13:00:00Z',
            reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 }
          }
        ],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: [{ login: 'assignee1', id: 200, type: 'User' }]
      }

      const contributors = getUniqueContributors(mockIssue)
      
      // Should be 4: author + assignee1 + user1 + user2
      expect(contributors).toBe(4)
    })

    it('should handle duplicate contributors', () => {
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 2,
        reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
        comments_data: [
          {
            id: 1,
            user: { login: 'author', id: 100, type: 'User' }, // Same as issue author
            created_at: '2023-01-01T12:00:00Z',
            reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 }
          }
        ],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: [{ login: 'author', id: 100, type: 'User' }] // Same as issue author
      }

      const contributors = getUniqueContributors(mockIssue)
      
      // Should be 1: only the author (deduplicated)
      expect(contributors).toBe(1)
    })
  })

  describe('getTimeSinceLastActivity', () => {
    it('should calculate days since last activity', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: threeDaysAgo.toISOString(),
        closed_at: null,
        comments: 0,
        reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
        comments_data: [],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: []
      }

      const days = getTimeSinceLastActivity(mockIssue)
      
      // Should be around 3 days (allowing for some variance due to timing)
      expect(days).toBeGreaterThanOrEqual(3)
      expect(days).toBeLessThanOrEqual(4)
    })
  })

  describe('getIssueAge', () => {
    it('should calculate days since issue creation', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: fiveDaysAgo.toISOString(),
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 0,
        reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
        comments_data: [],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: []
      }

      const age = getIssueAge(mockIssue)
      
      // Should be around 5 days (allowing for some variance due to timing)
      expect(age).toBeGreaterThanOrEqual(5)
      expect(age).toBeLessThanOrEqual(6)
    })
  })

  describe('calculatePreviousScore', () => {
    it('should return 0 for issues created less than 7 days ago', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: twoDaysAgo.toISOString(),
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 5,
        reactions: { total_count: 3, '+1': 2, '-1': 0, laugh: 1, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
        comments_data: [],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: []
      }

      const previousScore = await calculatePreviousScore(mockIssue, mockOctokit, 'owner', 'repo')
      
      expect(previousScore).toBe(0)
    })

    it('should calculate historic score for older issues', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      
      const mockIssue: IssueDetails = {
        id: '1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: tenDaysAgo.toISOString(),
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 5,
        reactions: { total_count: 3, '+1': 2, '-1': 0, laugh: 1, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
        comments_data: [
          {
            id: 1,
            user: { login: 'user1', id: 1, type: 'User' },
            created_at: fiveDaysAgo.toISOString(), // This comment is newer than 7 days ago
            reactions: { total_count: 2, '+1': 1, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 1, rocket: 0, eyes: 0 }
          }
        ],
        user: { login: 'author', id: 100, type: 'User' },
        assignees: []
      }

      const previousScore = await calculatePreviousScore(mockIssue, mockOctokit, 'owner', 'repo')
      
      // Should be greater than 0 but less than current score (since it excludes newer comments)
      expect(previousScore).toBeGreaterThan(0)
    })
  })

  describe('calculateEngagementScores', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should calculate score for single issue', async () => {
      const mockConfig: EngagementConfig = {
        issueNumber: 123,
        repoOwner: 'owner',
        repoName: 'repo',
        token: 'token',
        project: '',
        projectColumn: 'Engagement Score',
        applyScores: false
      }

      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          number: 123,
          title: 'Test Issue',
          body: 'Test body',
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          closed_at: null,
          comments: 0,
          reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
          user: { login: 'author', id: 100, type: 'User' },
          assignees: []
        }
      })

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      const response = await calculateEngagementScores(mockConfig, mockOctokit)

      expect(response.totalItems).toBe(1)
      expect(response.items).toHaveLength(1)
      expect(response.items[0].issueNumber).toBe(123)
      expect(response.items[0].engagement.score).toBeGreaterThan(0)
    })

    it('should calculate scores for project issues', async () => {
      const mockConfig: EngagementConfig = {
        issueNumber: 0,
        repoOwner: 'owner',
        repoName: 'repo',
        token: 'token',
        project: '1',
        projectColumn: 'Engagement Score',
        applyScores: false
      }

      // Mock GraphQL response for project items
      mockOctokit.graphql.mockResolvedValue({
        repository: {
          projectV2: {
            id: 'project-id',
            items: {
              pageInfo: {
                hasNextPage: false,
                endCursor: null
              },
              nodes: [
                {
                  id: 'item-1',
                  content: {
                    number: 123,
                    repository: {
                      name: 'repo',
                      owner: {
                        login: 'owner'
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      })

      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          number: 123,
          title: 'Test Issue',
          body: 'Test body',
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          closed_at: null,
          comments: 0,
          reactions: { total_count: 0, '+1': 0, '-1': 0, laugh: 0, hooray: 0, confused: 0, heart: 0, rocket: 0, eyes: 0 },
          user: { login: 'author', id: 100, type: 'User' },
          assignees: []
        }
      })

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      const response = await calculateEngagementScores(mockConfig, mockOctokit)

      expect(response.totalItems).toBe(1)
      expect(response.items).toHaveLength(1)
      expect(response.project).toBeDefined()
      expect(response.project?.number).toBe(1)
    })

    it('should throw error when neither project nor issue is specified', async () => {
      const mockConfig: EngagementConfig = {
        issueNumber: 0,
        repoOwner: 'owner',
        repoName: 'repo',
        token: 'token',
        project: '',
        projectColumn: 'Engagement Score',
        applyScores: false
      }

      await expect(calculateEngagementScores(mockConfig, mockOctokit)).rejects.toThrow(
        'Either project number or issue number must be specified'
      )
    })
  })

  describe('updateProjectWithScores', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should skip update when applyScores is false', async () => {
      const mockConfig: EngagementConfig = {
        issueNumber: 123,
        repoOwner: 'owner',
        repoName: 'repo',
        token: 'token',
        project: '1',
        projectColumn: 'Engagement Score',
        applyScores: false
      }

      const mockResponse = {
        items: [],
        totalItems: 0
      }

      await updateProjectWithScores(mockConfig, mockResponse, mockOctokit)

      expect(mockOctokit.graphql).not.toHaveBeenCalled()
    })

    it('should update project items with scores', async () => {
      const mockConfig: EngagementConfig = {
        issueNumber: 123,
        repoOwner: 'owner',
        repoName: 'repo',
        token: 'token',
        project: '1',
        projectColumn: 'Engagement Score',
        applyScores: true
      }

      const mockResponse = {
        items: [
          {
            id: 'item-1',
            issueNumber: 123,
            engagement: {
              score: 42,
              previousScore: 30,
              classification: 'Hot' as const
            }
          }
        ],
        totalItems: 1
      }

      // Mock GraphQL response for getting project field
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          projectV2: {
            id: 'project-id',
            fields: {
              nodes: [
                {
                  id: 'field-id',
                  name: 'Engagement Score',
                  dataType: 'NUMBER'
                }
              ]
            }
          }
        }
      })

      // Mock GraphQL response for updating project item
      mockOctokit.graphql.mockResolvedValueOnce({
        updateProjectV2ItemFieldValue: {
          projectV2Item: {
            id: 'item-1'
          }
        }
      })

      await updateProjectWithScores(mockConfig, mockResponse, mockOctokit)

      expect(mockOctokit.graphql).toHaveBeenCalledTimes(2)
    })

    it('should handle missing project field gracefully', async () => {
      const mockConfig: EngagementConfig = {
        issueNumber: 123,
        repoOwner: 'owner',
        repoName: 'repo',
        token: 'token',
        project: '1',
        projectColumn: 'Nonexistent Field',
        applyScores: true
      }

      const mockResponse = {
        items: [],
        totalItems: 0
      }

      // Mock GraphQL response for getting project field (field not found)
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          projectV2: {
            id: 'project-id',
            fields: {
              nodes: [
                {
                  id: 'field-id',
                  name: 'Some Other Field',
                  dataType: 'TEXT'
                }
              ]
            }
          }
        }
      })

      await updateProjectWithScores(mockConfig, mockResponse, mockOctokit)

      // Should only call GraphQL once (to get fields) and not attempt to update
      expect(mockOctokit.graphql).toHaveBeenCalledTimes(1)
    })
  })
})