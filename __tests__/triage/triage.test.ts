/**
 * Unit tests for the apply functionality, src/github-apply.ts
 */

import * as path from 'path'
import * as core from '../../__fixtures__/actions/core.js'
// import * as github from '@actions/github'
import { octokit } from '../../__fixtures__/actions/github.js'
import * as issues from '../../__fixtures__/github/issues.js'
import * as summary from '../../__fixtures__/prompts/summary.js'
import * as merge from '../../__fixtures__/triage/merge.js'
import { jest } from '@jest/globals'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
// jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../../src/github/issues.js', () => issues)
jest.unstable_mockModule('../../src/prompts/summary.js', () => summary)
jest.unstable_mockModule('../../src/triage/merge.js', () => merge)

// Import the module being tested
const { mergeAndApplyTriage } = await import('../../src/triage/triage.js')

describe('mergeAndApplyTriage', () => {
  const testTempDir = '/tmp/test'

  const mockConfig = {
    dryRun: false,
    token: 'test-token',
    tempDir: testTempDir,
    issueNumber: 123,
    repository: 'owner/repo',
    repoName: 'repo',
    repoOwner: 'owner',
    aiEndpoint: 'test-endpoint',
    aiModel: 'test-model',
    aiToken: 'test-ai-token',
    applyComment: true,
    applyLabels: true,
    commentFooter: 'Test footer'
  }

  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()

    // Mock file system operations
    inMemoryFs.setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  it('should apply both labels and comments when both are enabled', async () => {
    const mockMergedResponse = {
      remarks: [],
      regression: null,
      labels: [
        { label: 'bug', reason: 'Contains error information' },
        { label: 'area-ui', reason: 'UI related issue' }
      ]
    }
    const mockLabels = ['bug', 'area-ui']

    const summaryResponseFile = '/tmp/test/summary-response.json'

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue(summaryResponseFile)

    await mergeAndApplyTriage(octokit, mockConfig)

    // Verify mergeResponses was called correctly
    expect(merge.mergeResponses).toHaveBeenCalledWith(
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
      octokit,
      summaryResponseFile,
      mockConfig,
      mockConfig.commentFooter
    )

    // Verify applyLabelsToIssue was called
    expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(octokit, mockLabels, mockConfig)
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
    const mockLabels = ['enhancement']

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)

    await mergeAndApplyTriage(octokit, configWithoutComment)

    // Verify generateSummary and commentOnIssue were NOT called
    expect(summary.generateSummary).not.toHaveBeenCalled()
    expect(issues.commentOnIssue).not.toHaveBeenCalled()

    // Verify applyLabelsToIssue was called
    expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(octokit, mockLabels, configWithoutComment)
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue(summaryResponseFile)

    await mergeAndApplyTriage(octokit, configWithoutLabels)

    // Verify generateSummary and commentOnIssue were called
    expect(summary.generateSummary).toHaveBeenCalledWith(
      configWithoutLabels,
      path.join(testTempDir, 'triage-assistant', 'responses.json')
    )
    expect(issues.commentOnIssue).toHaveBeenCalledWith(
      octokit,
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)

    await mergeAndApplyTriage(octokit, configWithNothing)

    // Verify only mergeResponses was called (for logging)
    expect(merge.mergeResponses).toHaveBeenCalled()
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/tmp/test/summary-response.json')

    await mergeAndApplyTriage(octokit, mockConfig)

    // Verify all functions were still called
    expect(merge.mergeResponses).toHaveBeenCalled()
    expect(summary.generateSummary).toHaveBeenCalled()
    expect(issues.commentOnIssue).toHaveBeenCalled()
    expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(octokit, [], mockConfig)
  })

  it('should propagate errors from mergeResponses', async () => {
    const error = new Error('Failed to merge responses')
    merge.mergeResponses.mockRejectedValue(error)

    await expect(mergeAndApplyTriage(octokit, mockConfig)).rejects.toThrow('Failed to merge responses')

    expect(merge.mergeResponses).toHaveBeenCalled()
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockRejectedValue(error)

    await expect(mergeAndApplyTriage(octokit, mockConfig)).rejects.toThrow('Failed to generate summary')

    expect(merge.mergeResponses).toHaveBeenCalled()
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue(summaryResponseFile)
    issues.commentOnIssue.mockRejectedValue(error)

    await expect(mergeAndApplyTriage(octokit, mockConfig)).rejects.toThrow('Failed to comment on issue')

    expect(merge.mergeResponses).toHaveBeenCalled()
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    issues.applyLabelsToIssue.mockRejectedValue(error)

    await expect(mergeAndApplyTriage(octokit, configLabelsOnly)).rejects.toThrow('Failed to apply labels')

    expect(merge.mergeResponses).toHaveBeenCalled()
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

    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/custom/summary.json')

    await mergeAndApplyTriage(octokit, configWithCustomTemp)

    expect(merge.mergeResponses).toHaveBeenCalledWith(
      '',
      path.join(customTempDir, 'triage-assistant', 'responses'),
      path.join(customTempDir, 'triage-assistant', 'responses.json')
    )

    expect(summary.generateSummary).toHaveBeenCalledWith(
      configWithCustomTemp,
      path.join(customTempDir, 'triage-assistant', 'responses.json')
    )
  })
})
