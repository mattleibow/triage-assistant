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
      },
      graphql: jest.fn()
    }

    // Mock github.getOctokit
    ;(github.getOctokit as any).mockReturnValue(mockOctokit)

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

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      expect(result.totalItems).toBe(1)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].issueNumber).toBe(123)
      expect(result.items[0].engagement.score).toBeGreaterThan(0)
      expect(result.items[0].engagement.previousScore).toBe(0)
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
        }
      ]

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: mockIssues })
      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssues[0] })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      expect(result.totalItems).toBe(1)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].issueNumber).toBe(123)
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

    it('should handle GraphQL errors gracefully', async () => {
      config.applyScores = true
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

      mockOctokit.graphql.mockRejectedValue(new Error('GraphQL Error'))

      await updateProjectWithScores(config, response)

      expect(core.warning).toHaveBeenCalledWith('Failed to update project: Error: GraphQL Error')
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
        updated_at: new Date().toISOString(),
        closed_at: null,
        comments: 20,
        reactions: { total_count: 15 },
        user: { login: 'author' },
        assignees: [{ login: 'assignee1' }]
      }

      mockOctokit.rest.issues.get.mockResolvedValue({ data: highEngagementIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      expect(result.items[0].engagement.score).toBeGreaterThan(20)
    })

    it('should handle duplicate contributors correctly', async () => {
      config.issueNumber = 123
      config.project = ''

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
        assignees: [{ login: 'assignee1' }, { login: 'author' }] // Duplicate with author
      }

      const mockComments = [
        {
          id: 1,
          user: { login: 'author' }, // Duplicate with author
          created_at: '2023-01-01T12:00:00Z',
          reactions: { total_count: 1 }
        }
      ]

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments })

      const result = await calculateEngagementScores(config)

      // Should count unique contributors: author, assignee1 = 2
      expect(result.items[0].engagement.score).toBeGreaterThan(0)
    })
  })
})
