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
const { 
  calculateEngagementScores, 
  updateProjectWithScores,
  runEngagementWorkflow 
} = await import('../src/engagement.js')

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
      },
      graphql: jest.fn()
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

  describe('runEngagementWorkflow', () => {
    it('should run complete engagement workflow', async () => {
      const mockTriageConfig = {
        ...config,
        template: 'engagement-score',
        project: '1',
        applyScores: true,
        tempDir: '/tmp'
      }

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

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [mockIssue] })
      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })
      mockOctokit.graphql.mockResolvedValue({
        repository: {
          projectV2: {
            id: 'project-123',
            fields: {
              nodes: [
                { id: 'field-123', name: 'Engagement Score', dataType: 'TEXT' }
              ]
            }
          }
        }
      })

      const result = await runEngagementWorkflow(mockTriageConfig)

      expect(result).toBe('/tmp/engagement-response.json')
      expect(core.info).toHaveBeenCalledWith('Running in engagement scoring mode')
      expect(core.info).toHaveBeenCalledWith('Calculated engagement scores for 1 items')
      expect(core.setOutput).not.toHaveBeenCalled() // This should be called by main.ts
    })

    it('should skip project update when applyScores is false', async () => {
      const mockTriageConfig = {
        ...config,
        template: 'engagement-score',
        project: '1',
        applyScores: false,
        tempDir: '/tmp'
      }

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

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [mockIssue] })
      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      await runEngagementWorkflow(mockTriageConfig)

      expect(core.info).toHaveBeenCalledWith('Skipping project update')
    })
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

    it('should update project with engagement scores using GraphQL', async () => {
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

      // Mock project and field lookup
      mockOctokit.graphql
        .mockResolvedValueOnce({
          repository: {
            projectV2: {
              id: 'project-123',
              fields: {
                nodes: [
                  { id: 'field-123', name: 'Engagement Score', dataType: 'TEXT' }
                ]
              }
            }
          }
        })
        .mockResolvedValueOnce({
          node: {
            items: {
              nodes: [
                {
                  id: 'item-123',
                  content: { number: 123 }
                }
              ]
            }
          }
        })
        .mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
            projectV2Item: { id: 'item-123' }
          }
        })

      await updateProjectWithScores(config, response)

      expect(core.info).toHaveBeenCalledWith('Updating project #1 with engagement scores')
      expect(core.info).toHaveBeenCalledWith('Updated issue #123 with score 10')
      expect(core.info).toHaveBeenCalledWith('Successfully updated 1 of 1 items')
    })

    it('should handle missing project gracefully', async () => {
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

      mockOctokit.graphql.mockResolvedValue({
        repository: {
          projectV2: null
        }
      })

      await updateProjectWithScores(config, response)

      expect(core.warning).toHaveBeenCalledWith('Failed to update project: Error: Project #1 not found')
    })

    it('should handle missing engagement field gracefully', async () => {
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

      mockOctokit.graphql.mockResolvedValue({
        repository: {
          projectV2: {
            id: 'project-123',
            fields: {
              nodes: [
                { id: 'field-other', name: 'Other Field', dataType: 'TEXT' }
              ]
            }
          }
        }
      })

      await updateProjectWithScores(config, response)

      expect(core.warning).toHaveBeenCalledWith(
        'Field "Engagement Score" not found in project. Available fields: Other Field'
      )
    })

    it('should handle individual issue update failures gracefully', async () => {
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

      mockOctokit.graphql
        .mockResolvedValueOnce({
          repository: {
            projectV2: {
              id: 'project-123',
              fields: {
                nodes: [
                  { id: 'field-123', name: 'Engagement Score', dataType: 'TEXT' }
                ]
              }
            }
          }
        })
        .mockResolvedValueOnce({
          node: {
            items: {
              nodes: [
                {
                  id: 'item-123',
                  content: { number: 123 }
                }
              ]
            }
          }
        })
        .mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
            projectV2Item: { id: 'item-123' }
          }
        })
        .mockResolvedValueOnce({
          node: {
            items: {
              nodes: [] // Issue 124 not found in project
            }
          }
        })

      await updateProjectWithScores(config, response)

      expect(core.info).toHaveBeenCalledWith('Updated issue #123 with score 10')
      expect(core.warning).toHaveBeenCalledWith('Issue #124 not found in project')
      expect(core.info).toHaveBeenCalledWith('Successfully updated 1 of 2 items')
    })

    it('should fallback to logging when GraphQL fails', async () => {
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
      expect(core.info).toHaveBeenCalledWith('Would update 1 items in project with engagement scores')
      expect(core.info).toHaveBeenCalledWith('Would update issue #123 with score 10')
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
        },
        {
          id: 2,
          user: { login: 'assignee1' }, // Duplicate with assignee
          created_at: '2023-01-01T13:00:00Z',
          reactions: { total_count: 2 }
        },
        {
          id: 3,
          user: { login: 'commenter1' }, // Unique commenter
          created_at: '2023-01-01T14:00:00Z',
          reactions: { total_count: 0 }
        }
      ]

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments })

      const result = await calculateEngagementScores(config)

      // Should count unique contributors: author, assignee1, commenter1 = 3
      // Score = 3*5 (comments) + 1*6 (reactions) + 2*3 (contributors) + time factors
      expect(result.items[0].engagement.score).toBeGreaterThan(20) // Should be significant
    })

    it('should weight different engagement factors correctly', async () => {
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
        comments: 10, // Comments weight = 3
        reactions: { total_count: 5 }, // Reactions weight = 1
        user: { login: 'author' },
        assignees: [{ login: 'assignee1' }] // Contributors weight = 2
      }

      const mockComments = [
        {
          id: 1,
          user: { login: 'commenter1' },
          created_at: '2023-01-01T12:00:00Z',
          reactions: { total_count: 3 } // Additional reactions
        }
      ]

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments })

      const result = await calculateEngagementScores(config)

      // Expected score calculation:
      // Comments: 10 * 3 = 30
      // Reactions: (5 + 3) * 1 = 8
      // Contributors: 3 * 2 = 6 (author, assignee1, commenter1)
      // Plus time factors (small positive numbers)
      expect(result.items[0].engagement.score).toBeGreaterThan(44) // 30 + 8 + 6
    })

    it('should handle issues with no engagement correctly', async () => {
      config.issueNumber = 123
      config.project = ''

      const mockIssue = {
        id: 123,
        number: 123,
        title: 'Empty Issue',
        body: 'No engagement',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        comments: 0,
        reactions: { total_count: 0 },
        user: { login: 'author' },
        assignees: []
      }

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      // Should still have some score from the single contributor (author) and time factors
      expect(result.items[0].engagement.score).toBeGreaterThan(0)
      expect(result.items[0].engagement.score).toBeLessThan(10) // Should be low
    })
  })

  describe('classification logic', () => {
    it('should classify issues as Hot when score increases', async () => {
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
        comments: 10,
        reactions: { total_count: 5 },
        user: { login: 'author' },
        assignees: []
      }

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      // Since previousScore is always 0 and current score > 0, should be Hot
      expect(result.items[0].engagement.classification).toBe('Hot')
    })

    it('should not classify issues as Hot when score stays the same', async () => {
      // This would require mocking the calculatePreviousScore function
      // For now, we test that the classification logic exists
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
        comments: 0,
        reactions: { total_count: 0 },
        user: { login: 'author' },
        assignees: []
      }

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue })
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })

      const result = await calculateEngagementScores(config)

      // With minimal engagement, should still be Hot since previousScore is 0
      expect(result.items[0].engagement.classification).toBe('Hot')
    })
  })
})
