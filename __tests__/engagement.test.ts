/**
 * Unit tests for the engagement functionality, src/engagement.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'
import * as github from '../__fixtures__/actions-github.js'
import type { EngagementConfig } from '../src/triage-config.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)

// Import the module being tested
const { calculateEngagementScores, updateProjectWithScores } = await import('../src/engagement.js')

describe('engagement', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOctokit: any
  let config: EngagementConfig

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Octokit
    mockOctokit = {
      rest: {
        issues: {
          get: jest.fn(),
          listComments: jest.fn(),
          listForRepo: jest.fn()
        }
      }
    }

    // Mock github.getOctokit
    ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

    config = {
      issueNumber: 123,
      repository: 'owner/repo',
      repoName: 'repo',
      repoOwner: 'owner',
      project: '',
      projectColumn: 'Engagement Score',
      token: 'fake-token',
      applyScores: false
    }
  })

  describe('calculateEngagementScores', () => {
    it('should calculate engagement score for a single issue', async () => {
      config.issueNumber = 123
      config.project = '' // No project, single issue mode

      const mockIssue = {
        id: 123,
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        comments: 5,
        reactions: { total_count: 3 },
        user: { login: 'author' },
        assignees: [{ login: 'assignee1' }]
      }

      const mockComments = [
        {
          id: 1,
          user: { login: 'commenter1' },
          created_at: '2023-01-01T12:00:00Z',
          reactions: { total_count: 1 }
        },
        {
          id: 2,
          user: { login: 'commenter2' },
          created_at: '2023-01-01T13:00:00Z',
          reactions: { total_count: 2 }
        }
      ]

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments })

      const result = await calculateEngagementScores(config)

      expect(result.totalItems).toBe(1)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].issueNumber).toBe(123)
      expect(result.items[0].engagement.score).toBeGreaterThan(0)
      expect(result.items[0].engagement.previousScore).toBe(0)
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123
      })
    })

    it('should calculate engagement scores for project issues', async () => {
      config.project = '1'
      config.issueNumber = 0

      const mockIssues = [
        {
          id: 123,
          number: 123,
          title: 'Issue 1',
          body: 'Body 1',
          state: 'open',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          closed_at: null,
          comments: 2,
          reactions: { total_count: 1 },
          user: { login: 'author1' },
          assignees: []
        },
        {
          id: 124,
          number: 124,
          title: 'Issue 2',
          body: 'Body 2',
          state: 'closed',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-03T00:00:00Z',
          closed_at: '2023-01-03T00:00:00Z',
          comments: 1,
          reactions: { total_count: 0 },
          user: { login: 'author2' },
          assignees: []
        }
      ]

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: mockIssues })
      mockOctokit.rest.issues.get.mockImplementation(({ issue_number }: { issue_number: number }) => {
        const issue = mockIssues.find((i) => i.number === issue_number)
        return Promise.resolve({ data: issue })
      })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      expect(result.totalItems).toBe(2)
      expect(result.items).toHaveLength(2)
      expect(result.items[0].issueNumber).toBe(123)
      expect(result.items[1].issueNumber).toBe(124)
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        state: 'all',
        per_page: 100
      })
    })

    it('should throw error when neither project nor issue number is specified', async () => {
      config.project = ''
      config.issueNumber = 0

      await expect(calculateEngagementScores(config)).rejects.toThrow(
        'Either project or issue number must be specified'
      )
    })

    it('should handle API errors gracefully for project mode', async () => {
      config.project = '1'
      config.issueNumber = 0

      mockOctokit.rest.issues.listForRepo.mockRejectedValue(new Error('API Error'))

      const result = await calculateEngagementScores(config)

      expect(result.totalItems).toBe(0)
      expect(result.items).toHaveLength(0)
      expect(core.warning).toHaveBeenCalledWith('Failed to get issues: Error: API Error')
    })
  })

  describe('updateProjectWithScores', () => {
    it('should skip update when applyScores is false', async () => {
      config.applyScores = false
      config.project = '1'

      const response = {
        items: [
          {
            issueNumber: 123,
            engagement: { score: 10, previousScore: 5, classification: 'Hot' as const }
          }
        ],
        totalItems: 1
      }

      await updateProjectWithScores(config, response)

      expect(core.info).toHaveBeenCalledWith('Skipping project update')
    })

    it('should skip update when no project is specified', async () => {
      config.applyScores = true
      config.project = ''

      const response = {
        items: [
          {
            issueNumber: 123,
            engagement: { score: 10, previousScore: 5, classification: 'Hot' as const }
          }
        ],
        totalItems: 1
      }

      await updateProjectWithScores(config, response)

      expect(core.info).toHaveBeenCalledWith('Skipping project update')
    })

    it('should log update actions when conditions are met', async () => {
      config.applyScores = true
      config.project = '1'

      const response = {
        items: [
          {
            issueNumber: 123,
            engagement: { score: 10, previousScore: 5, classification: 'Hot' as const }
          },
          {
            issueNumber: 124,
            engagement: { score: 8, previousScore: 3, classification: null }
          }
        ],
        totalItems: 2
      }

      await updateProjectWithScores(config, response)

      expect(core.info).toHaveBeenCalledWith('Updating project #1 with engagement scores')
      expect(core.info).toHaveBeenCalledWith('Would update 2 items in project with engagement scores')
      expect(core.info).toHaveBeenCalledWith('Would update issue #123 with score 10')
      expect(core.info).toHaveBeenCalledWith('Would update issue #124 with score 8')
    })
  })

  describe('engagement scoring algorithm', () => {
    it('should calculate higher scores for more engaged issues', async () => {
      config.issueNumber = 123
      config.project = ''

      // High engagement issue
      const highEngagementIssue = {
        id: 123,
        number: 123,
        title: 'High Engagement Issue',
        body: 'Lots of discussion',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: new Date().toISOString(), // Very recent
        closed_at: null,
        comments: 20, // Many comments
        reactions: { total_count: 15 }, // Many reactions
        user: { login: 'author' },
        assignees: [{ login: 'assignee1' }, { login: 'assignee2' }] // Multiple assignees
      }

      const highEngagementComments = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        user: { login: `commenter${i % 5}` }, // 5 different commenters
        created_at: '2023-01-01T12:00:00Z',
        reactions: { total_count: 1 }
      }))

      mockOctokit.rest.issues.get.mockResolvedValue({ data: highEngagementIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: highEngagementComments })

      const highResult = await calculateEngagementScores(config)

      // Reset mocks for low engagement issue
      jest.clearAllMocks()
      ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

      // Low engagement issue
      const lowEngagementIssue = {
        id: 124,
        number: 124,
        title: 'Low Engagement Issue',
        body: 'Not much happening',
        state: 'open',
        created_at: '2020-01-01T00:00:00Z', // Very old
        updated_at: '2020-01-02T00:00:00Z', // Old last update
        closed_at: null,
        comments: 1, // Few comments
        reactions: { total_count: 0 }, // No reactions
        user: { login: 'author' },
        assignees: [] // No assignees
      }

      mockOctokit.rest.issues.get.mockResolvedValue({ data: lowEngagementIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      config.issueNumber = 124
      const lowResult = await calculateEngagementScores(config)

      expect(highResult.items[0].engagement.score).toBeGreaterThan(lowResult.items[0].engagement.score)
    })
  })
})
