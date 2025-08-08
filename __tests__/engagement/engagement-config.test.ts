import { jest } from '@jest/globals'
import {
  loadTriageConfig,
  DEFAULT_ENGAGEMENT_WEIGHTS
} from '../../src/engagement/engagement-config.js'

// Mock fs module
const mockExistsSync = jest.fn() as jest.MockedFunction<typeof import('fs').existsSync>
const mockReadFile = jest.fn() as jest.MockedFunction<typeof import('fs').promises.readFile>

jest.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readFile: mockReadFile
  }
}))

describe('EngagementConfig', () => {
  const originalCwd = process.cwd()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.chdir(originalCwd)
  })

  describe('loadTriageConfig', () => {
    it('should return default weights when no config file exists', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await loadTriageConfig('/test/workspace')

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should load config from .triagerc.yml', async () => {
      mockExistsSync.mockImplementation((filePath) => 
        filePath === '/test/workspace/.triagerc.yml'
      )
      mockReadFile.mockResolvedValue(
        'engagement:\n  weights:\n    comments: 5\n    reactions: 2' as any
      )

      const result = await loadTriageConfig('/test/workspace')

      expect(result).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 5,
        reactions: 2
      })
    })

    it('should merge partial weights with defaults', async () => {
      mockExistsSync.mockImplementation((filePath) => 
        filePath === '/test/workspace/.triagerc.yml'
      )
      mockReadFile.mockResolvedValue(
        'engagement:\n  weights:\n    comments: 8\n    lastActivity: 3' as any
      )

      const result = await loadTriageConfig('/test/workspace')

      expect(result).toEqual({
        comments: 8,
        reactions: DEFAULT_ENGAGEMENT_WEIGHTS.reactions,
        contributors: DEFAULT_ENGAGEMENT_WEIGHTS.contributors,
        lastActivity: 3,
        issueAge: DEFAULT_ENGAGEMENT_WEIGHTS.issueAge,
        linkedPullRequests: DEFAULT_ENGAGEMENT_WEIGHTS.linkedPullRequests
      })
    })

    it('should handle invalid YAML gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue(
        'invalid: yaml: content: [' as any
      )

      const result = await loadTriageConfig('/test/workspace')

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should handle file read errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockRejectedValue(new Error('Permission denied'))

      const result = await loadTriageConfig('/test/workspace')

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })
  })

  describe('DEFAULT_ENGAGEMENT_WEIGHTS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ENGAGEMENT_WEIGHTS).toEqual({
        comments: 3,
        reactions: 1,
        contributors: 2,
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      })
    })
  })
})