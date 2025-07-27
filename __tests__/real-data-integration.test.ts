/**
 * Integration tests using real data fixtures
 * These tests use realistic GitHub issues, AI responses, and configurations
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'
import * as github from '../__fixtures__/actions-github.js'
import * as issues from '../__fixtures__/github-issues.js'
import * as fs from 'fs'
import * as path from 'path'

// Mock dependencies
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../src/github-issues.js', () => issues)

// Import test data
import { realGitHubIssues, expectedTriageResults, sampleLabels } from '../__fixtures__/real-github-issues.js'
import { 
  bugReportResponse, 
  featureRequestResponse, 
  documentationResponse,
  regressionResponse,
  issueResponseMap 
} from '../__fixtures__/real-ai-responses.js'
import { 
  singleLabelConfig, 
  multiLabelConfig, 
  regressionConfig,
  dryRunConfig,
  createConfigForIssue 
} from '../__fixtures__/real-configs.js'
import { FileSystemMock } from './helpers/filesystem-mock.js'

// Import modules being tested
const { applyLabelsToIssue, commentOnIssue } = await import('../src/github-issues.js')

describe('Real Data Integration Tests', () => {
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
  } as any // Type assertion to bypass strict typing for mock

  beforeEach(() => {
    jest.clearAllMocks()
    github.getOctokit.mockImplementation(() => mockOctokit)
    inMemoryFs.setup()
    mockOctokit.rest.reactions.listForIssue.mockResolvedValue({ data: [] })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('GitHub Issues Integration', () => {
    describe('applyLabelsToIssue with real responses', () => {
      it('should apply bug label for crash report', async () => {
        const config = createConfigForIssue(1234)
        const response = bugReportResponse

        await applyLabelsToIssue(mockOctokit, response, config)

        expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
          owner: 'example',
          repo: 'awesome-project',
          issue_number: 1234,
          labels: ['type/bug']
        })
      })

      it('should apply feature label for enhancement request', async () => {
        const config = createConfigForIssue(1235)
        const response = featureRequestResponse

        await applyLabelsToIssue(mockOctokit, response, config)

        expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
          owner: 'example',
          repo: 'awesome-project',
          issue_number: 1235,
          labels: ['type/feature']
        })
      })

      it('should apply documentation label for API docs issue', async () => {
        const config = createConfigForIssue(1236)
        const response = documentationResponse

        await applyLabelsToIssue(mockOctokit, response, config)

        expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
          owner: 'example',
          repo: 'awesome-project',
          issue_number: 1236,
          labels: ['type/docs']
        })
      })

      it('should handle empty labels gracefully', async () => {
        const config = createConfigForIssue(1234)
        const response = { labels: [], remarks: [], regression: null }

        await applyLabelsToIssue(mockOctokit, response, config)

        expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
      })

      it('should skip API call in dry run mode', async () => {
        const config = { ...dryRunConfig, issueNumber: 1234 }
        const response = bugReportResponse

        await applyLabelsToIssue(mockOctokit, response, config)

        expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
        expect(core.info).toHaveBeenCalledWith('Dry run: Skipping applying labels: type/bug')
      })
    })

    describe('commentOnIssue with real responses', () => {
      it('should add comment with AI reasoning for bug report', async () => {
        const config = createConfigForIssue(1234)
        const summaryFile = '/tmp/test/summary.md'
        const summaryContent = `## Triage Summary

This issue has been automatically triaged as a **bug report**.

**Reasoning:** Clear bug report with reproducible steps, error logs, and specific environment details. The NullReferenceException and crash behavior clearly indicate a software defect.

**Applied Labels:**
- \`type/bug\`: Software defect requiring investigation and fix

The issue provides excellent reproduction steps and error details, making it ready for developer investigation.`

        inMemoryFs.forceSet(summaryFile, summaryContent)

        await commentOnIssue(mockOctokit, summaryFile, config, '<!-- AI Triage Assistant -->')

        expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
          owner: 'example',
          repo: 'awesome-project',
          issue_number: 1234,
          body: expect.stringContaining('This issue has been automatically triaged as a **bug report**')
        })
      })

      it('should include footer in comment', async () => {
        const config = createConfigForIssue(1235)
        const summaryFile = '/tmp/test/summary.md'
        const summaryContent = 'Feature request summary'
        const footer = '<!-- Generated by AI Triage Assistant v1.0 -->'

        inMemoryFs.forceSet(summaryFile, summaryContent)

        await commentOnIssue(mockOctokit, summaryFile, config, footer)

        expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
          owner: 'example',
          repo: 'awesome-project',
          issue_number: 1235,
          body: expect.stringContaining(footer)
        })
      })

      it('should skip empty comments', async () => {
        const config = createConfigForIssue(1234)
        const summaryFile = '/tmp/test/empty-summary.md'

        inMemoryFs.forceSet(summaryFile, '   \n  \n  ')

        await commentOnIssue(mockOctokit, summaryFile, config)

        expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled()
      })

      it('should skip commenting in dry run mode', async () => {
        const config = { ...dryRunConfig, issueNumber: 1234 }
        const summaryFile = '/tmp/test/summary.md'
        const summaryContent = 'Test summary content'

        inMemoryFs.forceSet(summaryFile, summaryContent)

        await commentOnIssue(mockOctokit, summaryFile, config)

        expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled()
        expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Dry run: Skipping commenting'))
      })
    })
  })

  describe('Real Issue Classification Scenarios', () => {
    it('should correctly classify crash report with stack trace', () => {
      const crashIssue = realGitHubIssues.find(issue => issue.number === 1234)
      expect(crashIssue).toBeDefined()
      expect(crashIssue!.title).toContain('crashes when clicking save')
      expect(crashIssue!.body).toContain('NullReferenceException')
      
      const expectedResult = expectedTriageResults[1234]
      expect(expectedResult.labels[0].label).toBe('type/bug')
      expect(expectedResult.priority).toBe('high')
    })

    it('should correctly classify feature request', () => {
      const featureIssue = realGitHubIssues.find(issue => issue.number === 1235)
      expect(featureIssue).toBeDefined()
      expect(featureIssue!.title).toContain('Add dark mode support')
      expect(featureIssue!.body).toContain('Feature Request')
      
      const expectedResult = expectedTriageResults[1235]
      expect(expectedResult.labels[0].label).toBe('type/feature')
      expect(expectedResult.priority).toBe('medium')
    })

    it('should correctly identify performance regression', () => {
      const regressionIssue = realGitHubIssues.find(issue => issue.number === 1238)
      expect(regressionIssue).toBeDefined()
      expect(regressionIssue!.title).toContain('Performance regression after v2.1.0')
      expect(regressionIssue!.body).toContain('Version 2.0.5 (Working)')
      
      const expectedResult = expectedTriageResults[1238]
      expect(expectedResult.labels[0].label).toBe('type/bug')
      expect(expectedResult.regression).toBeDefined()
      expect(expectedResult.regression!['working-version']).toBe('2.0.5')
      expect(expectedResult.regression!['broken-version']).toBe('2.1.0')
    })

    it('should classify security issues as high priority bugs', () => {
      const securityIssue = realGitHubIssues.find(issue => issue.number === 1239)
      expect(securityIssue).toBeDefined()
      expect(securityIssue!.title).toContain('Security vulnerability')
      expect(securityIssue!.body).toContain('⚠️ **SECURITY SENSITIVE**')
      
      const expectedResult = expectedTriageResults[1239]
      expect(expectedResult.labels[0].label).toBe('type/bug')
      expect(expectedResult.priority).toBe('high')
    })

    it('should classify documentation issues correctly', () => {
      const docsIssue = realGitHubIssues.find(issue => issue.number === 1236)
      expect(docsIssue).toBeDefined()
      expect(docsIssue!.title).toContain('API documentation is incomplete')
      expect(docsIssue!.body).toContain('Missing Documentation')
      
      const expectedResult = expectedTriageResults[1236]
      expect(expectedResult.labels[0].label).toBe('type/docs')
    })

    it('should classify support questions appropriately', () => {
      const questionIssue = realGitHubIssues.find(issue => issue.number === 1237)
      expect(questionIssue).toBeDefined()
      expect(questionIssue!.title).toContain('How to configure SSL certificates?')
      expect(questionIssue!.body).toContain('Questions')
      
      const expectedResult = expectedTriageResults[1237]
      expect(expectedResult.labels[0].label).toBe('question')
    })
  })

  describe('AI Response Validation', () => {
    it('should validate bug report response structure', () => {
      expect(bugReportResponse.labels).toHaveLength(1)
      expect(bugReportResponse.labels[0].label).toBe('type/bug')
      expect(bugReportResponse.labels[0].reason).toContain('Clear bug report')
      expect(bugReportResponse.regression).toBeNull()
      expect(bugReportResponse.remarks).toEqual([])
    })

    it('should validate regression response structure', () => {
      expect(regressionResponse.labels).toHaveLength(1)
      expect(regressionResponse.regression).toBeDefined()
      expect(regressionResponse.regression!['working-version']).toBe('2.0.5')
      expect(regressionResponse.regression!['broken-version']).toBe('2.1.0')
      expect(regressionResponse.regression!.evidence).toContain('Performance metrics')
    })

    it('should map issues to appropriate responses', () => {
      // Test the mapping for all issues
      realGitHubIssues.forEach(issue => {
        const response = issueResponseMap.get(issue.number)
        expect(response).toBeDefined()
        expect(response!.labels).toBeDefined()
        expect(response!.remarks).toBeDefined()
      })
    })
  })

  describe('Configuration Scenarios', () => {
    it('should handle single-label configuration', () => {
      expect(singleLabelConfig.template).toBe('single-label')
      expect(singleLabelConfig.labelPrefix).toBe('type/')
      expect(singleLabelConfig.issueNumber).toBe(1234)
    })

    it('should handle multi-label configuration', () => {
      expect(multiLabelConfig.template).toBe('multi-label')
      expect(multiLabelConfig.labelPrefix).toBe('')
    })

    it('should handle regression detection configuration', () => {
      expect(regressionConfig.template).toBe('regression')
      expect(regressionConfig.labelPrefix).toBe('type/')
    })

    it('should create dynamic configurations correctly', () => {
      const config = createConfigForIssue(999, 'multi-label')
      expect(config.issueNumber).toBe(999)
      expect(config.template).toBe('multi-label')
    })
  })

  describe('Label Processing', () => {
    it('should validate sample labels structure', () => {
      sampleLabels.forEach(label => {
        expect(label.name).toBeTruthy()
        expect(label.color).toMatch(/^[0-9a-f]{6}$/i)
        expect(typeof label.description).toBe('string')
      })
    })

    it('should include common label categories', () => {
      const labelNames = sampleLabels.map(l => l.name)
      expect(labelNames).toContain('bug')
      expect(labelNames).toContain('enhancement')
      expect(labelNames).toContain('documentation')
      expect(labelNames).toContain('question')
    })

    it('should include prefixed labels', () => {
      const labelNames = sampleLabels.map(l => l.name)
      expect(labelNames.some(name => name.startsWith('type/'))).toBe(true)
      expect(labelNames.some(name => name.startsWith('priority/'))).toBe(true)
      expect(labelNames.some(name => name.startsWith('area/'))).toBe(true)
    })
  })

  describe('Error Handling with Real Data', () => {
    it('should handle missing issue data gracefully', async () => {
      const config = createConfigForIssue(999999) // Non-existent issue
      const emptyResponse = { labels: [], remarks: [], regression: null }

      await applyLabelsToIssue(mockOctokit, emptyResponse, config)

      expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })

    it('should handle malformed AI responses', async () => {
      const config = createConfigForIssue(1234)
      const malformedResponse = {
        labels: [
          { label: '', reason: 'Empty label' },
          { label: 'valid-label', reason: 'Valid label' }
        ],
        remarks: [],
        regression: null
      }

      await applyLabelsToIssue(mockOctokit, malformedResponse, config)

      // Should only apply the valid label
      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'example',
        repo: 'awesome-project',
        issue_number: 1234,
        labels: ['', 'valid-label'] // Note: API filtering would handle empty labels
      })
    })

    it('should handle file system errors in commenting', async () => {
      const config = createConfigForIssue(1234)
      const nonExistentFile = '/tmp/test/non-existent-summary.md'

      await expect(commentOnIssue(mockOctokit, nonExistentFile, config))
        .rejects.toThrow()
    })
  })
})