/**
 * Unit tests for the apply functionality, src/apply.ts
 */

import * as path from 'path'
import * as core from '../__fixtures__/core.js'
import { jest } from '@jest/globals'
import { FileSystemMock } from '../__tests__/helpers/filesystem-mock.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Mock GitHub module
const mockGetOctokit = jest.fn()
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: mockGetOctokit
}))

// Mock github functions using fixture
const githubMock = await import('../__fixtures__/github.js')
jest.unstable_mockModule('../src/github.js', () => githubMock)

// Mock summary functions using fixture
const summaryMock = await import('../__fixtures__/summary.js')
jest.unstable_mockModule('../src/summary.js', () => summaryMock)

// Import the module being tested
const { applyLabelsAndComment } = await import('../src/apply.js')

describe('apply', () => {
  const testTempDir = '/tmp/test'
  const mockOctokit = {
    rest: {
      issues: {
        createComment: jest.fn(),
        addLabels: jest.fn()
      }
    }
  }

  const mockConfig = {
    token: 'test-token',
    tempDir: testTempDir,
    issueNumber: 123,
    repository: 'owner/repo',
    repoName: 'repo',
    repoOwner: 'owner',
    aiEndpoint: 'test-endpoint',
    aiModel: 'test-model',
    applyComment: true,
    applyLabels: true,
    commentFooter: 'Test footer'
  }

  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock returns
    mockGetOctokit.mockReturnValue(mockOctokit)

    // Mock file system operations
    inMemoryFs.setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('applyLabelsAndComment', () => {
    it('should apply both labels and comments when both are enabled', async () => {
      const mockMergedResponse = {
        labels: [
          { label: 'bug', reason: 'Contains error information' },
          { label: 'area-ui', reason: 'UI related issue' }
        ]
      }

      const summaryResponseFile = '/tmp/test/summary-response.json'

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      summaryMock.generateSummary.mockResolvedValue(summaryResponseFile)

      await applyLabelsAndComment(mockConfig)

      // Verify mergeResponses was called correctly
      expect(summaryMock.mergeResponses).toHaveBeenCalledWith(
        '',
        path.join(testTempDir, 'triage-assistant', 'responses'),
        path.join(testTempDir, 'triage-assistant', 'responses.json')
      )

      // Verify core.info was called with merged response
      expect(core.info).toHaveBeenCalledWith(`Merged response: ${JSON.stringify(mockMergedResponse, null, 2)}`)

      // Verify generateSummary was called
      expect(summaryMock.generateSummary).toHaveBeenCalledWith(
        mockConfig,
        path.join(testTempDir, 'triage-assistant', 'responses.json')
      )

      // Verify commentOnIssue was called
      expect(githubMock.commentOnIssue).toHaveBeenCalledWith(
        mockOctokit,
        summaryResponseFile,
        mockConfig,
        mockConfig.commentFooter
      )

      // Verify applyLabelsToIssue was called
      expect(githubMock.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, mockMergedResponse, mockConfig)
    })

    it('should only apply labels when applyComment is false', async () => {
      const configWithoutComment = {
        ...mockConfig,
        applyComment: false,
        applyLabels: true
      }

      const mockMergedResponse = {
        labels: [{ label: 'enhancement', reason: 'Feature request' }]
      }

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)

      await applyLabelsAndComment(configWithoutComment)

      // Verify generateSummary and commentOnIssue were NOT called
      expect(summaryMock.generateSummary).not.toHaveBeenCalled()
      expect(githubMock.commentOnIssue).not.toHaveBeenCalled()

      // Verify applyLabelsToIssue was called
      expect(githubMock.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, mockMergedResponse, configWithoutComment)
    })

    it('should only apply comments when applyLabels is false', async () => {
      const configWithoutLabels = {
        ...mockConfig,
        applyComment: true,
        applyLabels: false
      }

      const mockMergedResponse = {
        labels: [{ label: 'bug', reason: 'Contains error' }]
      }

      const summaryResponseFile = '/tmp/test/summary-response.json'

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      summaryMock.generateSummary.mockResolvedValue(summaryResponseFile)

      await applyLabelsAndComment(configWithoutLabels)

      // Verify generateSummary and commentOnIssue were called
      expect(summaryMock.generateSummary).toHaveBeenCalledWith(
        configWithoutLabels,
        path.join(testTempDir, 'triage-assistant', 'responses.json')
      )
      expect(githubMock.commentOnIssue).toHaveBeenCalledWith(
        mockOctokit,
        summaryResponseFile,
        configWithoutLabels,
        configWithoutLabels.commentFooter
      )

      // Verify applyLabelsToIssue was NOT called
      expect(githubMock.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should not apply anything when both applyComment and applyLabels are false', async () => {
      const configWithNothing = {
        ...mockConfig,
        applyComment: false,
        applyLabels: false
      }

      const mockMergedResponse = {
        labels: [{ label: 'bug', reason: 'Contains error' }]
      }

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)

      await applyLabelsAndComment(configWithNothing)

      // Verify only mergeResponses was called (for logging)
      expect(summaryMock.mergeResponses).toHaveBeenCalled()
      expect(core.info).toHaveBeenCalled()

      // Verify nothing else was called
      expect(summaryMock.generateSummary).not.toHaveBeenCalled()
      expect(githubMock.commentOnIssue).not.toHaveBeenCalled()
      expect(githubMock.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should handle empty merged response gracefully', async () => {
      const mockMergedResponse = {
        labels: []
      }

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      summaryMock.generateSummary.mockResolvedValue('/tmp/test/summary-response.json')

      await applyLabelsAndComment(mockConfig)

      // Verify all functions were still called
      expect(summaryMock.mergeResponses).toHaveBeenCalled()
      expect(summaryMock.generateSummary).toHaveBeenCalled()
      expect(githubMock.commentOnIssue).toHaveBeenCalled()
      expect(githubMock.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, mockMergedResponse, mockConfig)
    })

    it('should propagate errors from mergeResponses', async () => {
      const error = new Error('Failed to merge responses')
      summaryMock.mergeResponses.mockRejectedValue(error)

      await expect(applyLabelsAndComment(mockConfig)).rejects.toThrow('Failed to merge responses')

      expect(summaryMock.mergeResponses).toHaveBeenCalled()
      expect(summaryMock.generateSummary).not.toHaveBeenCalled()
      expect(githubMock.commentOnIssue).not.toHaveBeenCalled()
      expect(githubMock.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should propagate errors from generateSummary', async () => {
      const mockMergedResponse = { labels: [] }
      const error = new Error('Failed to generate summary')

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      summaryMock.generateSummary.mockRejectedValue(error)

      await expect(applyLabelsAndComment(mockConfig)).rejects.toThrow('Failed to generate summary')

      expect(summaryMock.mergeResponses).toHaveBeenCalled()
      expect(summaryMock.generateSummary).toHaveBeenCalled()
      expect(githubMock.commentOnIssue).not.toHaveBeenCalled()
      expect(githubMock.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should propagate errors from commentOnIssue', async () => {
      const mockMergedResponse = { labels: [] }
      const summaryResponseFile = '/tmp/test/summary-response.json'
      const error = new Error('Failed to comment on issue')

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      summaryMock.generateSummary.mockResolvedValue(summaryResponseFile)
      githubMock.commentOnIssue.mockRejectedValue(error)

      await expect(applyLabelsAndComment(mockConfig)).rejects.toThrow('Failed to comment on issue')

      expect(summaryMock.mergeResponses).toHaveBeenCalled()
      expect(summaryMock.generateSummary).toHaveBeenCalled()
      expect(githubMock.commentOnIssue).toHaveBeenCalled()
      expect(githubMock.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should propagate errors from applyLabelsToIssue', async () => {
      const configLabelsOnly = {
        ...mockConfig,
        applyComment: false,
        applyLabels: true
      }

      const mockMergedResponse = { labels: [] }
      const error = new Error('Failed to apply labels')

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      githubMock.applyLabelsToIssue.mockRejectedValue(error)

      await expect(applyLabelsAndComment(configLabelsOnly)).rejects.toThrow('Failed to apply labels')

      expect(summaryMock.mergeResponses).toHaveBeenCalled()
      expect(summaryMock.generateSummary).not.toHaveBeenCalled()
      expect(githubMock.commentOnIssue).not.toHaveBeenCalled()
      expect(githubMock.applyLabelsToIssue).toHaveBeenCalled()
    })

    it('should create correct file paths based on tempDir', async () => {
      const customTempDir = '/custom/temp'
      const configWithCustomTemp = {
        ...mockConfig,
        tempDir: customTempDir
      }

      const mockMergedResponse = { labels: [] }

      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)
      summaryMock.generateSummary.mockResolvedValue('/custom/summary.json')

      await applyLabelsAndComment(configWithCustomTemp)

      expect(summaryMock.mergeResponses).toHaveBeenCalledWith(
        '',
        path.join(customTempDir, 'triage-assistant', 'responses'),
        path.join(customTempDir, 'triage-assistant', 'responses.json')
      )

      expect(summaryMock.generateSummary).toHaveBeenCalledWith(
        configWithCustomTemp,
        path.join(customTempDir, 'triage-assistant', 'responses.json')
      )
    })

    it('should initialize octokit with the provided token', async () => {
      const customToken = 'custom-token-123'
      const configWithCustomToken = {
        ...mockConfig,
        token: customToken
      }

      const mockMergedResponse = { labels: [] }
      summaryMock.mergeResponses.mockResolvedValue(mockMergedResponse)

      await applyLabelsAndComment(configWithCustomToken)

      expect(mockGetOctokit).toHaveBeenCalledWith(customToken)
    })
  })
})
