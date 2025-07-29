import { jest } from '@jest/globals'
import {
  IssueDetails,
  getHistoricalIssueDetails,
  getUniqueContributorsCount,
  getDaysSinceLastActivity,
  getDaysSinceCreation,
  calculateScore,
  calculateHistoricalScore
} from '../src/github/issue-details.js'
import { createEngagementItem } from '../src/engagement/engagement.js'

describe('IssueDetails', () => {
  // Mock date for consistent testing
  const MOCK_NOW = new Date('2023-01-10T12:00:00Z')
  const MOCK_SEVEN_DAYS_AGO = new Date('2023-01-03T12:00:00Z')

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
        user: { login: 'user1', type: 'User' },
        reaction: 'thumbs_up',
        createdAt: new Date('2023-01-02T12:00:00Z')
      },
      {
        user: { login: 'user2', type: 'User' },
        reaction: 'heart',
        createdAt: new Date('2023-01-05T12:00:00Z')
      }
    ],
    comments: [
      {
        user: { login: 'user1', type: 'User' },
        createdAt: new Date('2023-01-02T12:00:00Z'),
        reactions: [
          {
            user: { login: 'user3', type: 'User' },
            reaction: 'thumbs_up',
            createdAt: new Date('2023-01-02T13:00:00Z')
          },
          {
            user: { login: 'user4', type: 'User' },
            reaction: 'heart',
            createdAt: new Date('2023-01-03T12:00:00Z')
          }
        ]
      },
      {
        user: { login: 'user2', type: 'User' },
        createdAt: new Date('2023-01-05T12:00:00Z'),
        reactions: [
          {
            user: { login: 'user5', type: 'User' },
            reaction: 'rocket',
            createdAt: new Date('2023-01-05T13:00:00Z')
          }
        ]
      }
    ],
    user: { login: 'author', type: 'User' },
    assignees: [
      { login: 'assignee1', type: 'User' },
      { login: 'assignee2', type: 'User' }
    ]
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(MOCK_NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getHistoricalIssueDetails', () => {
    it('should return issue with zero activity for issues newer than 7 days', () => {
      const recentIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2023-01-09T12:00:00Z') // 1 day ago
      }

      const result = getHistoricalIssueDetails(recentIssue)

      expect(result.comments).toEqual([])
      expect(result.reactions).toEqual([])
    })

    it('should filter comments to 7 days ago for older issues', () => {
      const result = getHistoricalIssueDetails(mockIssueDetails)

      expect(result.comments).toHaveLength(1) // Only the comment from 2023-01-02
      expect(result.comments[0].user.login).toBe('user1')
    })

    it('should filter reactions correctly for historic snapshots', () => {
      const result = getHistoricalIssueDetails(mockIssueDetails)

      // Should only include reactions from before 7 days ago (2023-01-02)
      expect(result.reactions).toHaveLength(1)
      expect(result.reactions[0].user.login).toBe('user1')

      // Should filter comment reactions too
      expect(result.comments[0].reactions).toHaveLength(2)
    })

    it('should set updatedAt to seven days ago', () => {
      const result = getHistoricalIssueDetails(mockIssueDetails)

      expect(result.updatedAt).toEqual(MOCK_SEVEN_DAYS_AGO)
    })

    it('should handle empty comments', () => {
      const issueWithoutComments: IssueDetails = {
        ...mockIssueDetails,
        comments: []
      }

      const result = getHistoricalIssueDetails(issueWithoutComments)

      expect(result.comments).toEqual([])
    })

    it('should handle null comments gracefully', () => {
      const issueWithNullComments: IssueDetails = {
        ...mockIssueDetails,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments: null as any
      }

      const result = getHistoricalIssueDetails(issueWithNullComments)

      expect(result.comments).toEqual([])
    })
  })

  describe('getUniqueContributorsCount', () => {
    it('should count unique contributors from author, assignees, and comments', () => {
      const result = getUniqueContributorsCount(mockIssueDetails)

      // author (1) + assignees (2) + comment authors (2) = 5 unique contributors
      expect(result).toBe(5)
    })

    it('should handle duplicate contributors', () => {
      const issueWithDuplicates: IssueDetails = {
        ...mockIssueDetails,
        user: { login: 'user1', type: 'User' }, // Same as comment author
        assignees: [
          { login: 'user2', type: 'User' } // Same as comment author
        ]
      }

      const result = getUniqueContributorsCount(issueWithDuplicates)

      expect(result).toBe(2) // user1 and user2
    })

    it('should handle empty assignees', () => {
      const issueWithoutAssignees: IssueDetails = {
        ...mockIssueDetails,
        assignees: []
      }

      const result = getUniqueContributorsCount(issueWithoutAssignees)

      expect(result).toBe(3) // author + 2 comment authors
    })

    it('should handle empty comments', () => {
      const issueWithoutComments: IssueDetails = {
        ...mockIssueDetails,
        comments: []
      }

      const result = getUniqueContributorsCount(issueWithoutComments)

      expect(result).toBe(3) // author + 2 assignees
    })

    it('should handle null comments gracefully', () => {
      const issueWithNullComments: IssueDetails = {
        ...mockIssueDetails,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments: null as any
      }

      const result = getUniqueContributorsCount(issueWithNullComments)

      expect(result).toBe(3) // author + 2 assignees
    })
  })

  describe('getDaysSinceLastActivity', () => {
    it('should calculate days since last update', () => {
      const result = getDaysSinceLastActivity(mockIssueDetails)

      // From 2023-01-08 to 2023-01-10 = 2 days
      expect(result).toBe(2)
    })

    it('should handle same day activity', () => {
      const todayIssue: IssueDetails = {
        ...mockIssueDetails,
        updatedAt: new Date('2023-01-10T12:00:00Z')
      }

      const result = getDaysSinceLastActivity(todayIssue)

      expect(result).toBe(0)
    })

    it('should handle fractional days by ceiling', () => {
      const recentIssue: IssueDetails = {
        ...mockIssueDetails,
        updatedAt: new Date('2023-01-09T18:00:00Z') // 18 hours ago
      }

      const result = getDaysSinceLastActivity(recentIssue)

      expect(result).toBe(1) // Ceiling of 0.75 days
    })

    it('should handle very old activity', () => {
      const oldIssue: IssueDetails = {
        ...mockIssueDetails,
        updatedAt: new Date('2022-12-01T12:00:00Z')
      }

      const result = getDaysSinceLastActivity(oldIssue)

      expect(result).toBe(40) // About 40 days
    })
  })

  describe('getDaysSinceCreation', () => {
    it('should calculate days since issue creation', () => {
      const result = getDaysSinceCreation(mockIssueDetails)

      // From 2023-01-01 to 2023-01-10 = 9 days
      expect(result).toBe(9)
    })

    it('should handle same day creation', () => {
      const todayIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2023-01-10T12:00:00Z')
      }

      const result = getDaysSinceCreation(todayIssue)

      expect(result).toBe(0)
    })

    it('should handle fractional days by ceiling', () => {
      const recentIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2023-01-09T18:00:00Z') // 18 hours ago
      }

      const result = getDaysSinceCreation(recentIssue)

      expect(result).toBe(1) // Ceiling of 0.75 days
    })

    it('should handle very old issues', () => {
      const oldIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2022-01-01T12:00:00Z')
      }

      const result = getDaysSinceCreation(oldIssue)

      expect(result).toBe(374) // About 1 year + 9 days
    })
  })

  describe('calculateScore', () => {
    it('should calculate score based on weighted algorithm', () => {
      const result = calculateScore(mockIssueDetails)

      // Expected calculation:
      // Comments: 3 * 2 = 6 (2 comments)
      // Reactions: 1 * (2 + 3) = 5 (issue reactions + comment reactions)
      // Contributors: 2 * 5 = 10 (5 unique contributors)
      // Last Activity: 1 * (1/2) = 0.5 (2 days since last activity)
      // Issue Age: 1 * (1/9) = 0.111... (9 days old)
      // Linked PRs: 2 * 0 = 0
      // Total: 6 + 5 + 10 + 0.5 + 0.111 + 0 = 21.611, rounded = 22

      expect(result).toBe(22)
    })

    it('should handle minimum values for time factors', () => {
      const sameTimingIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2023-01-10T12:00:00Z'),
        updatedAt: new Date('2023-01-10T12:00:00Z')
      }

      const result = calculateScore(sameTimingIssue)

      // Should use Math.max(1, ...) for both time factors
      expect(result).toBeGreaterThan(0)
    })

    it('should handle zero comments', () => {
      const noCommentsIssue: IssueDetails = {
        ...mockIssueDetails,
        comments: []
      }

      const result = calculateScore(noCommentsIssue)

      expect(result).toBeGreaterThan(0) // Should still have reactions and contributors
    })

    it('should handle zero reactions', () => {
      const noReactionsIssue: IssueDetails = {
        ...mockIssueDetails,
        reactions: [],
        comments: [
          {
            user: { login: 'user1', type: 'User' },
            createdAt: new Date('2023-01-02T12:00:00Z'),
            reactions: []
          }
        ]
      }

      const result = calculateScore(noReactionsIssue)

      expect(result).toBeGreaterThan(0) // Should still have comments and contributors
    })

    it('should handle single contributor', () => {
      const singleContributorIssue: IssueDetails = {
        ...mockIssueDetails,
        assignees: [],
        comments: []
      }

      const result = calculateScore(singleContributorIssue)

      expect(result).toBeGreaterThan(0)
    })

    it('should handle empty comments gracefully', () => {
      const issueWithNullComments: IssueDetails = {
        ...mockIssueDetails,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comments: null as any
      }

      const result = calculateScore(issueWithNullComments)

      expect(result).toBeGreaterThan(0)
    })
  })

  describe('calculateHistoricalScore', () => {
    it('should calculate score based on historical data', async () => {
      const result = await calculateHistoricalScore(mockIssueDetails)

      // Should be lower than current score since historic data has less activity
      const currentScore = calculateScore(mockIssueDetails)
      expect(result).toBeLessThan(currentScore)
    })

    it('should return score > 0 for issues newer than 7 days', async () => {
      const recentIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2023-01-09T12:00:00Z') // 1 day ago
      }

      const result = await calculateHistoricalScore(recentIssue)

      expect(result).toBeGreaterThan(0) // Should still have score from contributors
    })

    it('should handle issues with no historic activity', async () => {
      const noHistoricActivityIssue: IssueDetails = {
        ...mockIssueDetails,
        comments: [
          {
            user: { login: 'user1', type: 'User' },
            createdAt: new Date('2023-01-08T12:00:00Z'), // All activity after 7 days ago
            reactions: []
          }
        ]
      }

      const result = await calculateHistoricalScore(noHistoricActivityIssue)

      expect(result).toBeGreaterThan(0) // Should still have basic score from contributors
    })
  })

  describe('createEngagementItem', () => {
    it('should create engagement item for single issue', async () => {
      const result = await createEngagementItem(mockIssueDetails)

      expect(result).toEqual({
        issue: {
          id: mockIssueDetails.id,
          owner: mockIssueDetails.owner,
          repo: mockIssueDetails.repo,
          number: mockIssueDetails.number
        },
        engagement: {
          score: expect.any(Number),
          previousScore: expect.any(Number),
          classification: expect.any(String)
        }
      })
    })

    it('should create engagement item with project ID', async () => {
      const result = await createEngagementItem(mockIssueDetails, 'project-item-123')

      expect(result).toEqual({
        id: 'project-item-123',
        issue: {
          id: mockIssueDetails.id,
          owner: mockIssueDetails.owner,
          repo: mockIssueDetails.repo,
          number: mockIssueDetails.number
        },
        engagement: {
          score: expect.any(Number),
          previousScore: expect.any(Number),
          classification: expect.any(String)
        }
      })
    })

    it('should classify as Hot when current score > previous score', async () => {
      // Create a specific issue for this test
      const testIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2023-01-01T12:00:00Z'), // Old enough to have historic data
        comments: [
          {
            user: { login: 'user1', type: 'User' },
            createdAt: new Date('2023-01-08T12:00:00Z'), // Recent comment
            reactions: [
              {
                user: { login: 'user2', type: 'User' },
                reaction: 'heart',
                createdAt: new Date('2023-01-08T13:00:00Z')
              }
            ]
          }
        ],
        reactions: [
          {
            user: { login: 'user1', type: 'User' },
            reaction: 'thumbs_up',
            createdAt: new Date('2023-01-08T12:00:00Z')
          }
        ]
      }

      const result = await createEngagementItem(testIssue)

      expect(result.engagement.classification).toBe('Hot')
    })

    it('should classify based on score comparison', async () => {
      // Create a specific issue for this test with minimal activity
      const testIssue: IssueDetails = {
        ...mockIssueDetails,
        createdAt: new Date('2022-12-01T12:00:00Z'), // Very old issue
        comments: [
          {
            user: { login: 'user1', type: 'User' },
            createdAt: new Date('2022-12-02T12:00:00Z'), // Old comment
            reactions: []
          }
        ],
        reactions: [
          {
            user: { login: 'user1', type: 'User' },
            reaction: 'thumbs_up',
            createdAt: new Date('2022-12-02T12:00:00Z')
          }
        ]
      }

      const currentScore = calculateScore(testIssue)
      const previousScore = await calculateHistoricalScore(testIssue)

      const result = await createEngagementItem(testIssue)

      // Verify that classification logic works correctly
      const expectedClassification = currentScore > previousScore ? 'Hot' : undefined
      expect(result.engagement.classification).toBe(expectedClassification)
    })

    it('should handle issues with minimal data', async () => {
      const minimalIssue: IssueDetails = {
        id: '1',
        owner: 'test-owner',
        repo: 'test-repo',
        number: 1,
        title: 'Minimal Issue',
        body: '',
        state: 'open',
        createdAt: new Date('2023-01-01T12:00:00Z'),
        updatedAt: new Date('2023-01-01T12:00:00Z'),
        closedAt: null,
        comments: [],
        reactions: [],
        user: { login: 'user', type: 'User' },
        assignees: []
      }

      const result = await createEngagementItem(minimalIssue)

      expect(result.issue.number).toBe(1)
      expect(result.engagement.score).toBeGreaterThan(0)
      expect(result.engagement.previousScore).toBeGreaterThanOrEqual(0)
    })
  })
})
