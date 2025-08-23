import * as path from 'path'
import { jest } from '@jest/globals'
import { FileSystemMock } from '../helpers/filesystem-mock.js'
import * as core from '../../__fixtures__/actions/core.js'
import { octokit } from '../../__fixtures__/actions/github.js'
import * as issues from '../../__fixtures__/github/issues.js'
import * as summary from '../../__fixtures__/prompts/summary.js'
import * as merge from '../../__fixtures__/triage/merge.js'
import * as selectLabelsFixture from '../../__fixtures__/prompts/select-labels.js'
import { ConfigFileLabels } from '../../src/config-file.js'
import { LabelTriageWorkflowConfig } from '../../src/config.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../../src/github/issues.js', () => issues)
jest.unstable_mockModule('../../src/prompts/summary.js', () => summary)
jest.unstable_mockModule('../../src/triage/merge.js', () => merge)
jest.unstable_mockModule('../../src/prompts/select-labels.js', () => selectLabelsFixture)

// Import the module being tested
const { mergeAndApplyTriage, runTriageWorkflow } = await import('../../src/triage/triage.js')

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

describe('runTriageWorkflow', () => {
  const testTempDir = '/tmp/test'

  const mockConfig: LabelTriageWorkflowConfig = {
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
    applyLabels: true,
    applyComment: true,
    commentFooter: 'Test footer'
  }

  const mockConfigFile: ConfigFileLabels = {
    groups: {
      regressions: {
        template: 'regression',
        label: 'regression'
      },
      areas: {
        template: 'single-label',
        labelPrefix: 'area/'
      }
    }
  }

  const mockConfigFileEmpty: ConfigFileLabels = {
    groups: {}
  }

  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
    inMemoryFs.setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  it('should call selectLabels for each group with correct configuration', async () => {
    // Mock selectLabels to resolve successfully
    selectLabelsFixture.selectLabels.mockResolvedValue('/tmp/test/response.json')

    // Mock merge functions
    const mockMergedResponse = {
      remarks: [],
      regression: null,
      labels: [{ label: 'severity/high', reason: 'Critical bug' }]
    }
    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/tmp/test/summary.json')

    const result = await runTriageWorkflow(mockConfig, mockConfigFile)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify selectLabels was called for each group
    expect(selectLabelsFixture.selectLabels).toHaveBeenCalledTimes(2)

    // Verify first group (regression) call
    expect(selectLabelsFixture.selectLabels).toHaveBeenNthCalledWith(1, 'regression', {
      ...mockConfig,
      labelPrefix: undefined,
      label: 'regression'
    })

    // Verify second group (area) call
    expect(selectLabelsFixture.selectLabels).toHaveBeenNthCalledWith(2, 'single-label', {
      ...mockConfig,
      labelPrefix: 'area/',
      label: undefined
    })

    // Verify result is the merged response file path
    expect(result).toBe('/tmp/test/triage-assistant/responses.json')
  })

  it('should add and remove eyes reactions when applying labels and summary', async () => {
    selectLabelsFixture.selectLabels.mockResolvedValue('/tmp/test/response.json')

    const mockMergedResponse = {
      remarks: [],
      regression: null,
      labels: []
    }
    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/tmp/test/summary.json')

    await runTriageWorkflow(mockConfig, mockConfigFile)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify addEyes was called at the start
    expect(issues.addEyes).toHaveBeenCalledWith(expect.anything(), mockConfig)

    // Verify removeEyes was called at the end
    expect(issues.removeEyes).toHaveBeenCalledWith(expect.anything(), mockConfig)

    // Verify correct order: addEyes -> selectLabels -> mergeAndApply -> removeEyes
    const addEyesCall = issues.addEyes.mock.invocationCallOrder[0]
    const removeEyesCall = issues.removeEyes.mock.invocationCallOrder[0]
    const selectLabelsCall = selectLabelsFixture.selectLabels.mock.invocationCallOrder[0]

    expect(addEyesCall).toBeLessThan(selectLabelsCall)
    expect(selectLabelsCall).toBeLessThan(removeEyesCall)
  })

  it('should not call selectLabels when no groups are configured', async () => {
    const mockMergedResponse = {
      remarks: [],
      regression: null,
      labels: []
    }
    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/tmp/test/summary.json')

    await runTriageWorkflow(mockConfig, mockConfigFileEmpty)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify selectLabels was not called
    expect(selectLabelsFixture.selectLabels).not.toHaveBeenCalled()

    // Verify core.info was not called for group configurations
    expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Selecting labels for group'))

    // Should still call eyes reactions and merge/apply
    expect(issues.addEyes).toHaveBeenCalled()
    expect(issues.removeEyes).toHaveBeenCalled()
  })

  it('should not add or remove eyes reactions when not applying labels or comments', async () => {
    const configNoApply = {
      ...mockConfig,
      applyLabels: false,
      applyComment: false
    }

    await runTriageWorkflow(configNoApply, mockConfigFileEmpty)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify no eyes reactions
    expect(issues.addEyes).not.toHaveBeenCalled()
    expect(issues.removeEyes).not.toHaveBeenCalled()

    // Verify no selectLabels
    expect(selectLabelsFixture.selectLabels).not.toHaveBeenCalled()

    // Verify no merge/apply operations
    expect(merge.mergeResponses).not.toHaveBeenCalled()
  })

  it('should handle selectLabels failures and still remove eyes reactions', async () => {
    const selectLabelsError = new Error('Failed to select labels')
    selectLabelsFixture.selectLabels.mockRejectedValue(selectLabelsError)

    await expect(runTriageWorkflow(mockConfig, mockConfigFile)).rejects.toThrow('Failed to select labels')

    // Verify addEyes was called
    expect(issues.addEyes).toHaveBeenCalledWith(expect.anything(), mockConfig)

    // Verify removeEyes was still called in finally block
    expect(issues.removeEyes).toHaveBeenCalledWith(expect.anything(), mockConfig)
  })

  it('should handle merge/apply failures and still remove eyes reactions', async () => {
    selectLabelsFixture.selectLabels.mockResolvedValue('/tmp/test/response.json')

    const mergeError = new Error('Failed to merge responses')
    merge.mergeResponses.mockRejectedValue(mergeError)

    await expect(runTriageWorkflow(mockConfig, mockConfigFile)).rejects.toThrow('Failed to merge responses')

    // Verify addEyes was called
    expect(issues.addEyes).toHaveBeenCalledWith(expect.anything(), mockConfig)

    // Verify selectLabels was called
    expect(selectLabelsFixture.selectLabels).toHaveBeenCalled()

    // Verify removeEyes was still called in finally block
    expect(issues.removeEyes).toHaveBeenCalledWith(expect.anything(), mockConfig)
  })

  it('should preserve original config values when calling selectLabels', async () => {
    const originalConfig = {
      ...mockConfig,
      labelPrefix: 'original-prefix/',
      label: 'original-label'
    }

    selectLabelsFixture.selectLabels.mockResolvedValue('/tmp/test/response.json')

    const mockMergedResponse = {
      remarks: [],
      regression: null,
      labels: []
    }
    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/tmp/test/summary.json')

    await runTriageWorkflow(originalConfig, mockConfigFile)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    // Verify first group (regression) call
    expect(selectLabelsFixture.selectLabels).toHaveBeenNthCalledWith(1, 'regression', {
      ...originalConfig,
      labelPrefix: undefined,
      label: 'regression'
    })

    // Verify second group (area) call
    expect(selectLabelsFixture.selectLabels).toHaveBeenNthCalledWith(2, 'single-label', {
      ...originalConfig,
      labelPrefix: 'area/',
      label: undefined
    })
  })

  it('should return empty string when no summary needed', async () => {
    const configNoApply = {
      ...mockConfig,
      applyLabels: false,
      applyComment: false
    }

    const result = await runTriageWorkflow(configNoApply, mockConfigFileEmpty)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    expect(result).toBe('')
    expect(merge.mergeResponses).not.toHaveBeenCalled()
  })

  it('should return merged response file path when summary is applied', async () => {
    selectLabelsFixture.selectLabels.mockResolvedValue('/tmp/test/response.json')

    const mockMergedResponse = {
      remarks: [],
      regression: null,
      labels: []
    }
    merge.mergeResponses.mockResolvedValue(mockMergedResponse)
    summary.generateSummary.mockResolvedValue('/tmp/test/summary.json')

    const result = await runTriageWorkflow(mockConfig, mockConfigFile)

    // Verify no failures occurred
    expect(core.setFailed).not.toHaveBeenCalled()

    expect(result).toBe('/tmp/test/triage-assistant/responses.json')
  })
})
