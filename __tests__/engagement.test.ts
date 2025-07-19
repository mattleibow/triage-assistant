import { jest } from '@jest/globals'

// Mock dependencies first
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  setOutput: jest.fn()
}))

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn()
  }
}))

jest.mock('../src/github/projects.js', () => ({
  getAllProjectItems: jest.fn(),
  updateProjectWithScores: jest.fn()
}))

jest.mock('../src/github/issues.js', () => ({
  getIssueDetails: jest.fn()
}))

jest.mock('../src/github/issue-details.js', () => ({
  calculateScore: jest.fn(),
  calculatePreviousScore: jest.fn()
}))

// Now import after mocks
import { runEngagementWorkflow, createEngagementItem } from '../src/engagement/engagement.js'
import { EverythingConfig } from '../src/config.js'
import { calculateScore, calculatePreviousScore } from '../src/github/issue-details.js'
import { getAllProjectItems } from '../src/github/projects.js'
import { getIssueDetails } from '../src/github/issues.js'

// Type the mocks
const mockCalculateScore = calculateScore as jest.MockedFunction<typeof calculateScore>
const mockCalculatePreviousScore = calculatePreviousScore as jest.MockedFunction<typeof calculatePreviousScore>
const mockGetAllProjectItems = getAllProjectItems as jest.MockedFunction<typeof getAllProjectItems>
const mockGetIssueDetails = getIssueDetails as jest.MockedFunction<typeof getIssueDetails>

describe('Engagement Scoring', () => {
  const mockConfig: EverythingConfig = {
    repoOwner: 'test-owner',
    repoName: 'test-repo',
    issueNumber: 123,
    projectNumber: 1,
    projectColumn: 'Engagement Score',
    applyScores: true,
    token: 'test-token',
    tempDir: '/tmp',
    dryRun: false,
    aiEndpoint: 'https://api.test.com',
    aiModel: 'test-model',
    aiToken: 'ai-token',
    template: 'engagement-score',
    repository: 'test-owner/test-repo',
    applyComment: false,
    applyLabels: false,
    commentFooter: '',
    label: '',
    labelPrefix: ''
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createEngagementItem', () => {
    it('should create engagement item with correct structure', async () => {
      const mockIssueDetails = {
        id: 'issue-1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        owner: 'test-owner',
        repo: 'test-repo',
        user: { login: 'author', type: 'User' },
        assignees: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        comments: 5,
        reactions: 3,
        reactions_data: [],
        comments_data: []
      }

      // Mock the score calculation functions
      mockCalculateScore.mockReturnValue(75)
      mockCalculatePreviousScore.mockResolvedValue(50)

      const result = await createEngagementItem(mockIssueDetails, 'project-item-1')

      expect(result).toEqual({
        id: 'project-item-1',
        issue: {
          id: 'issue-1',
          owner: 'test-owner',
          repo: 'test-repo',
          number: 123
        },
        engagement: {
          score: 75,
          previousScore: 50,
          classification: expect.any(String) // Should be Hot since score > previousScore
        }
      })
    })

    it('should handle missing project item ID', async () => {
      const mockIssueDetails = {
        id: 'issue-1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        owner: 'test-owner',
        repo: 'test-repo',
        user: { login: 'author', type: 'User' },
        assignees: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        comments: 2,
        reactions: 1,
        reactions_data: [],
        comments_data: []
      }

      mockCalculateScore.mockReturnValue(30)
      mockCalculatePreviousScore.mockResolvedValue(40)

      const result = await createEngagementItem(mockIssueDetails)

      expect(result).not.toHaveProperty('id')
      expect(result.engagement.classification).toBeUndefined()
    })
  })

  describe('runEngagementWorkflow', () => {
    it('should handle project mode correctly', async () => {
      mockGetAllProjectItems.mockResolvedValue([
        {
          id: 'item-1',
          projectId: 'project-1',
          content: {
            type: 'Issue',
            owner: 'test-owner',
            repo: 'test-repo',
            number: 123
          }
        }
      ])
      
      mockGetIssueDetails.mockResolvedValue({
        id: 'issue-1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        owner: 'test-owner',
        repo: 'test-repo',
        user: { login: 'author', type: 'User' },
        assignees: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        comments: 5,
        reactions: 3,
        reactions_data: [],
        comments_data: []
      })

      const result = await runEngagementWorkflow(mockConfig)
      
      expect(result).toMatch(/engagement-response\.json$/)
      expect(mockGetAllProjectItems).toHaveBeenCalledWith(
        expect.any(Object),
        'test-owner',
        'test-repo',
        1
      )
    })

    it('should handle single issue mode correctly', async () => {
      const singleIssueConfig = {
        ...mockConfig,
        projectNumber: 0 // No project specified
      }

      mockGetIssueDetails.mockResolvedValue({
        id: 'issue-1',
        number: 123,
        title: 'Test Issue',
        body: 'Test body',
        state: 'open',
        owner: 'test-owner',
        repo: 'test-repo',
        user: { login: 'author', type: 'User' },
        assignees: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        closed_at: null,
        comments: 2,
        reactions: 1,
        reactions_data: [],
        comments_data: []
      })

      const result = await runEngagementWorkflow(singleIssueConfig)
      
      expect(result).toMatch(/engagement-response\.json$/)
      expect(mockGetIssueDetails).toHaveBeenCalledWith(
        expect.any(Object),
        'test-owner',
        'test-repo',
        123
      )
    })
  })
})