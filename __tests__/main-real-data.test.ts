/**
 * Integration tests for main entry point using real data fixtures
 * Tests the complete triage workflow with realistic scenarios
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'
import * as github from '../__fixtures__/actions-github.js'
import * as prompts from '../__fixtures__/prompts.js'
import * as promptsSummary from '../__fixtures__/prompts-summary.js'
import * as ai from '../__fixtures__/ai.js'
import * as issues from '../__fixtures__/github-issues.js'

// Mock dependencies
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../src/prompts.js', () => prompts)
jest.unstable_mockModule('../src/prompts-summary.js', () => promptsSummary)
jest.unstable_mockModule('../src/ai.js', () => ai)
jest.unstable_mockModule('../src/github-issues.js', () => issues)

// Import test data  
import { 
  bugReportResponse, 
  featureRequestResponse,
  regressionResponse
} from '../__fixtures__/real-ai-responses.js'
import { 
  dryRunConfig
} from '../__fixtures__/real-configs.js'
import { FileSystemMock } from './helpers/filesystem-mock.js'

// Import the module being tested
const { run } = await import('../src/main.js')

describe('Main Entry Point with Real Data', () => {
  const inMemoryFs = new FileSystemMock()
  const mockOctokit = {
    rest: {
      issues: {
        createComment: jest.fn(),
        addLabels: jest.fn()
      },
      reactions: {
        createForIssue: jest.fn(),
        listForIssue: jest.fn()
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    inMemoryFs.setup()

    // Setup mock implementations
    github.getOctokit.mockImplementation(() => mockOctokit)
    prompts.generatePrompt.mockResolvedValue('Generated prompt content')
    ai.runInference.mockResolvedValue(undefined)
    promptsSummary.mergeResponses.mockResolvedValue(bugReportResponse)
    promptsSummary.generateSummary.mockResolvedValue('/tmp/test/summary.md')
    mockOctokit.rest.reactions.listForIssue.mockResolvedValue({ data: [] } as any)

    // Mock Action inputs
    core.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'github-token': 'test-token',
        'issue-number': '1234',
        'repository': 'example/test-repo',
        'ai-endpoint': 'https://models.inference.ai.azure.com',
        'ai-model': 'gpt-4',
        'ai-token': 'test-ai-token',
        'template': 'single-label',
        'label-prefix': 'type/',
        'label': 'bug',
        'apply-labels': 'true',
        'apply-comment': 'true',
        'comment-footer': '<!-- AI Triage Assistant -->'
      }
      return inputs[name] || ''
    })

    core.getBooleanInput.mockImplementation((name: string) => {
      const booleanInputs: Record<string, boolean> = {
        'dry-run': false,
        'apply-labels': true,
        'apply-comment': true
      }
      return booleanInputs[name] || false
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('End-to-end triage workflow', () => {
    it('should complete full triage workflow for bug report', async () => {
      // Setup AI response for bug classification
      const responseFile = '/tmp/test/triage-assistant/responses/response-test-guid.json'
      inMemoryFs.forceSet(responseFile, JSON.stringify(bugReportResponse))
      ai.runInference.mockResolvedValue(undefined)

      // Setup summary generation
      const summaryFile = '/tmp/test/summary.md'
      const summaryContent = `## Triage Summary

This issue has been classified as a **bug report**.

**Applied Labels:**
- \`type/bug\`: Clear bug report with reproduction steps and error details

**Reasoning:** The issue contains detailed reproduction steps, specific error messages, and environment information that clearly indicate a software defect.`

      inMemoryFs.forceSet(summaryFile, summaryContent)
      promptsSummary.generateSummary.mockResolvedValue(summaryFile)

      await run()

      // Verify the complete workflow executed
      expect(prompts.generatePrompt).toHaveBeenCalledTimes(2) // System and user prompts
      expect(ai.runInference).toHaveBeenCalledTimes(1)
      expect(promptsSummary.mergeResponses).toHaveBeenCalledTimes(1)
      expect(promptsSummary.generateSummary).toHaveBeenCalledTimes(1)
      expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, bugReportResponse, expect.any(Object))
      expect(issues.commentOnIssue).toHaveBeenCalledWith(mockOctokit, summaryFile, expect.any(Object), '<!-- AI Triage Assistant -->')
    })

    it('should handle feature request classification', async () => {
      // Override inputs for feature request
      core.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github-token': 'test-token',
          'issue-number': '1235',
          'repository': 'example/test-repo',
          'ai-endpoint': 'https://models.inference.ai.azure.com',
          'ai-model': 'gpt-4',
          'ai-token': 'test-ai-token',
          'template': 'single-label',
          'label-prefix': 'type/',
          'label': 'feature',
          'apply-labels': 'true',
          'apply-comment': 'true'
        }
        return inputs[name] || ''
      })

      const responseFile = '/tmp/test/feature-response.json'
      inMemoryFs.forceSet(responseFile, JSON.stringify(featureRequestResponse))
      ai.runInference.mockResolvedValue(undefined)
      promptsSummary.mergeResponses.mockResolvedValue(featureRequestResponse)

      await run()

      expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(mockOctokit, featureRequestResponse, expect.any(Object))
    })

    it('should handle regression detection workflow', async () => {
      core.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github-token': 'test-token',
          'issue-number': '1238',
          'repository': 'example/test-repo',
          'template': 'regression',
          'label-prefix': 'type/',
          'label': 'bug',
          'apply-labels': 'true',
          'apply-comment': 'true'
        }
        return inputs[name] || ''
      })

      const responseFile = '/tmp/test/regression-response.json'
      inMemoryFs.forceSet(responseFile, JSON.stringify(regressionResponse))
      ai.runInference.mockResolvedValue(undefined)
      promptsSummary.mergeResponses.mockResolvedValue(regressionResponse)

      await run()

      // Verify regression data was processed
      expect(promptsSummary.mergeResponses).toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).toHaveBeenCalledWith(
        mockOctokit, 
        expect.objectContaining({
          regression: expect.objectContaining({
            'working-version': '2.0.5',
            'broken-version': '2.1.0'
          })
        }), 
        expect.any(Object)
      )
    })

    it('should work in dry-run mode', async () => {
      core.getBooleanInput.mockImplementation((name: string) => {
        if (name === 'dry-run') return true
        return false
      })

      const responseFile = '/tmp/test/dry-run-response.json'
      inMemoryFs.forceSet(responseFile, JSON.stringify(bugReportResponse))
      ai.runInference.mockResolvedValue(undefined)

      await run()

      // Verify AI inference still ran but no GitHub actions were taken
      expect(ai.runInference).toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).toHaveBeenCalled() // Called but should not make API calls
      expect(issues.commentOnIssue).toHaveBeenCalled() // Called but should not make API calls
    })

    it('should handle labels-only workflow', async () => {
      core.getBooleanInput.mockImplementation((name: string) => {
        const booleanInputs: Record<string, boolean> = {
          'apply-labels': true,
          'apply-comment': false
        }
        return booleanInputs[name] || false
      })

      const responseFile = '/tmp/test/labels-only-response.json'
      inMemoryFs.forceSet(responseFile, JSON.stringify(bugReportResponse))
      ai.runInference.mockResolvedValue(undefined)

      await run()

      expect(issues.applyLabelsToIssue).toHaveBeenCalled()
      expect(promptsSummary.generateSummary).not.toHaveBeenCalled()
      expect(issues.commentOnIssue).not.toHaveBeenCalled()
    })

    it('should handle comments-only workflow', async () => {
      core.getBooleanInput.mockImplementation((name: string) => {
        const booleanInputs: Record<string, boolean> = {
          'apply-labels': false,
          'apply-comment': true
        }
        return booleanInputs[name] || false
      })

      const responseFile = '/tmp/test/comments-only-response.json'
      const summaryFile = '/tmp/test/comments-only-summary.md'
      
      inMemoryFs.forceSet(responseFile, JSON.stringify(bugReportResponse))
      inMemoryFs.forceSet(summaryFile, 'Summary content')
      
      ai.runInference.mockResolvedValue(undefined)
      promptsSummary.generateSummary.mockResolvedValue(summaryFile)

      await run()

      expect(promptsSummary.generateSummary).toHaveBeenCalled()
      expect(issues.commentOnIssue).toHaveBeenCalled()
      expect(issues.applyLabelsToIssue).not.toHaveBeenCalled()
    })
  })

  describe('Error handling in main workflow', () => {
    it('should handle AI inference failures gracefully', async () => {
      ai.runInference.mockRejectedValue(new Error('AI service unavailable'))

      await expect(run()).rejects.toThrow('AI service unavailable')

      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('AI service unavailable'))
    })

    it('should handle prompt generation failures', async () => {
      prompts.generatePrompt.mockRejectedValue(new Error('Template processing failed'))

      await expect(run()).rejects.toThrow('Template processing failed')
    })

    it('should handle GitHub API failures', async () => {
      const responseFile = '/tmp/test/github-error-response.json'
      inMemoryFs.forceSet(responseFile, JSON.stringify(bugReportResponse))
      ai.runInference.mockResolvedValue(undefined)

      issues.applyLabelsToIssue.mockRejectedValue(new Error('GitHub API rate limit exceeded'))

      await expect(run()).rejects.toThrow('GitHub API rate limit exceeded')
    })

    it('should handle missing configuration values', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'github-token') return ''
        return 'test-value'
      })

      await expect(run()).rejects.toThrow()
    })
  })
})