/**
 * Unit tests for the apply functionality, src/apply.ts
 */

import * as path from 'path'
import * as core from '../__fixtures__/actions-core.js'
import * as github from '../__fixtures__/actions-github.js'
import * as issues from '../__fixtures__/issues.js'
import * as summary from '../__fixtures__/summary.js'
import { jest } from '@jest/globals'
import { FileSystemMock } from '../__tests__/helpers/filesystem-mock.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../src/issues.js', () => issues)
jest.unstable_mockModule('../src/summary.js', () => summary)

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
    jest.resetAllMocks()

    // Setup mock returns
    github.getOctokit.mockImplementation(() => mockOctokit)

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
        remarks: [],
        regression: null,
        labels: [
          { label: 'bug', reason: 'Contains error information' },
          { label: 'area-ui', reason: 'UI related issue' }
        ]
      }

      const summaryResponseFile = '/tmp/test/summary-response.json'

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      summary.generateSummary.mockResolvedValue(summaryResponseFile)

      await applyLabelsAndComment(mockConfig)

      // Verify mergeResponses was called correctly
      expect(summary.mergeResponses).toHaveBeenCalledWith(
        '',
        path.join(testTempDir, 'triage-assistant', 'responses'),
        path.join(testTempDir, 'triage-assistant', 'responses.json')
      )

      // Verify core.info was called with merged response
      expect(core.info).toHaveBeenCalledWith(`Merged response: ${JSON.stringify(mockMergedResponse, null, 2)}`)

      // Verify generateSummary was called
      expect(summary.generateSummary).toHaveBeenCalledWith(
        mockConfig,
        path.join(testTempDir, 'triage-assistant', 'responses.json')
      )

      // Verify commentOnIssue was called
      expect(issues.commentOnIssue).toHaveBeenCalledWith(
        mockOctokit,
        summaryResponseFile,
        mockConfig,
        mockConfig.commentFooter
      )

      // Verify applyLabelsToIssue was called
      expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, mockMergedResponse, mockConfig)
    })

    it('should only apply labels when applyComment is false', async () => {
      const configWithoutComment = {
        ...mockConfig,
        applyComment: false,
        applyLabels: true
      }

      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: [{ label: 'enhancement', reason: 'Feature request' }]
      }

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)

      await applyLabelsAndComment(configWithoutComment)

      // Verify generateSummary and commentOnIssue were NOT called
      expect(summary.generateSummary).not.toHaveBeenCalled()
      expect(issues.commentOnIssue).not.toHaveBeenCalled()

      // Verify applyLabelsToIssue was called
      expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, mockMergedResponse, configWithoutComment)
    })

    it('should only apply comments when applyLabels is false', async () => {
      const configWithoutLabels = {
        ...mockConfig,
        applyComment: true,
        applyLabels: false
      }

      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: [{ label: 'bug', reason: 'Contains error' }]
      }

      const summaryResponseFile = '/tmp/test/summary-response.json'

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      summary.generateSummary.mockResolvedValue(summaryResponseFile)

      await applyLabelsAndComment(configWithoutLabels)

      // Verify generateSummary and commentOnIssue were called
      expect(summary.generateSummary).toHaveBeenCalledWith(
        configWithoutLabels,
        path.join(testTempDir, 'triage-assistant', 'responses.json')
      )
      expect(issues.commentOnIssue).toHaveBeenCalledWith(
        mockOctokit,
        summaryResponseFile,
        configWithoutLabels,
        configWithoutLabels.commentFooter
      )

      // Verify applyLabelsToIssue was NOT called
      expect(issues.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should not apply anything when both applyComment and applyLabels are false', async () => {
      const configWithNothing = {
        ...mockConfig,
        applyComment: false,
        applyLabels: false
      }

      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: [{ label: 'bug', reason: 'Contains error' }]
      }

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)

      await applyLabelsAndComment(configWithNothing)

      // Verify only mergeResponses was called (for logging)
      expect(summary.mergeResponses).toHaveBeenCalled()
      expect(core.info).toHaveBeenCalled()

      // Verify nothing else was called
      expect(summary.generateSummary).not.toHaveBeenCalled()
      expect(issues.commentOnIssue).not.toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should handle empty merged response gracefully', async () => {
      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: []
      }

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      summary.generateSummary.mockResolvedValue('/tmp/test/summary-response.json')

      await applyLabelsAndComment(mockConfig)

      // Verify all functions were still called
      expect(summary.mergeResponses).toHaveBeenCalled()
      expect(summary.generateSummary).toHaveBeenCalled()
      expect(issues.commentOnIssue).toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, mockMergedResponse, mockConfig)
    })

    it('should propagate errors from mergeResponses', async () => {
      const error = new Error('Failed to merge responses')
      summary.mergeResponses.mockRejectedValue(error)

      await expect(applyLabelsAndComment(mockConfig)).rejects.toThrow('Failed to merge responses')

      expect(summary.mergeResponses).toHaveBeenCalled()
      expect(summary.generateSummary).not.toHaveBeenCalled()
      expect(issues.commentOnIssue).not.toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should propagate errors from generateSummary', async () => {
      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: []
      }
      const error = new Error('Failed to generate summary')

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      summary.generateSummary.mockRejectedValue(error)

      await expect(applyLabelsAndComment(mockConfig)).rejects.toThrow('Failed to generate summary')

      expect(summary.mergeResponses).toHaveBeenCalled()
      expect(summary.generateSummary).toHaveBeenCalled()
      expect(issues.commentOnIssue).not.toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should propagate errors from commentOnIssue', async () => {
      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: []
      }
      const summaryResponseFile = '/tmp/test/summary-response.json'
      const error = new Error('Failed to comment on issue')

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      summary.generateSummary.mockResolvedValue(summaryResponseFile)
      issues.commentOnIssue.mockRejectedValue(error)

      await expect(applyLabelsAndComment(mockConfig)).rejects.toThrow('Failed to comment on issue')

      expect(summary.mergeResponses).toHaveBeenCalled()
      expect(summary.generateSummary).toHaveBeenCalled()
      expect(issues.commentOnIssue).toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).not.toHaveBeenCalled()
    })

    it('should propagate errors from applyLabelsToIssue', async () => {
      const configLabelsOnly = {
        ...mockConfig,
        applyComment: false,
        applyLabels: true
      }

      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: []
      }
      const error = new Error('Failed to apply labels')

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      issues.applyLabelsToIssue.mockRejectedValue(error)

      await expect(applyLabelsAndComment(configLabelsOnly)).rejects.toThrow('Failed to apply labels')

      expect(summary.mergeResponses).toHaveBeenCalled()
      expect(summary.generateSummary).not.toHaveBeenCalled()
      expect(issues.commentOnIssue).not.toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).toHaveBeenCalled()
    })

    it('should create correct file paths based on tempDir', async () => {
      const customTempDir = '/custom/temp'
      const configWithCustomTemp = {
        ...mockConfig,
        tempDir: customTempDir
      }

      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: []
      }

      summary.mergeResponses.mockResolvedValue(mockMergedResponse)
      summary.generateSummary.mockResolvedValue('/custom/summary.json')

      await applyLabelsAndComment(configWithCustomTemp)

      expect(summary.mergeResponses).toHaveBeenCalledWith(
        '',
        path.join(customTempDir, 'triage-assistant', 'responses'),
        path.join(customTempDir, 'triage-assistant', 'responses.json')
      )

      expect(summary.generateSummary).toHaveBeenCalledWith(
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

      const mockMergedResponse = {
        remarks: [],
        regression: null,
        labels: []
      }
      summary.mergeResponses.mockResolvedValue(mockMergedResponse)

      await applyLabelsAndComment(configWithCustomToken)

      expect(github.getOctokit).toHaveBeenCalledWith(customToken)
    })
  })
})
