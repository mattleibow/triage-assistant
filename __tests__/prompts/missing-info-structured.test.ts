/**
 * Unit tests for the structured missing-info prompt extraction functionality
 */
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import * as exec from '../../__fixtures__/actions/exec.js'
import * as prompts from '../../__fixtures__/prompts/prompts.js'
import * as ai from '../../__fixtures__/ai/ai.js'
import * as fs from 'fs'
import * as path from 'path'
import { InferenceConfig, SelectLabelsPromptConfig, TriageConfig } from '../../src/config.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'
import { systemPromptMissingInfo } from '../../src/prompts/select-labels/system-prompt-missing-info.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('../../src/prompts/prompts.js', () => prompts)
jest.unstable_mockModule('../../src/ai/ai.js', () => ai)
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'test-missing-info-guid')
}))

// Import the module being tested
const { selectLabels } = await import('../../src/prompts/select-labels.js')

describe('Missing Info Structured Extraction', () => {
  const mockConfig: SelectLabelsPromptConfig & InferenceConfig & TriageConfig = {
    dryRun: false,
    aiEndpoint: 'https://test-ai-endpoint.com',
    aiModel: 'test-model',
    aiToken: 'test-ai-token',
    token: 'test-token',
    tempDir: '/tmp/missing-info-test',
    issueNumber: 123,
    repository: 'owner/repo',
    labelPrefix: 'type/',
    label: 'missing-info'
  }

  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()
    inMemoryFs.setup()

    // Mock generatePrompt to simulate the real behavior
    prompts.generatePrompt.mockImplementation(async (template, outputPath) => {
      const processedContent = template.toString()
      if (outputPath) {
        await fs.promises.writeFile(outputPath, processedContent)
      }
      return processedContent
    })

    // Mock runInference to simulate AI inference
    ai.runInference.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('prompt structure and content', () => {
    it('should contain structured extraction instructions', () => {
      expect(systemPromptMissingInfo).toContain('Structured Information to Extract')
      expect(systemPromptMissingInfo).toContain('Reproduction Steps')
      expect(systemPromptMissingInfo).toContain('Repository/Code Links')
      expect(systemPromptMissingInfo).toContain('Version Information')
      expect(systemPromptMissingInfo).toContain('Environment Details')
    })

    it('should define clear extraction guidelines', () => {
      expect(systemPromptMissingInfo).toContain('Extraction Guidelines')
      expect(systemPromptMissingInfo).toContain('Extract information exactly as provided')
      expect(systemPromptMissingInfo).toContain('do not paraphrase')
    })

    it('should specify deterministic label assignment rules', () => {
      expect(systemPromptMissingInfo).toContain('Label Assignment Rules')
      expect(systemPromptMissingInfo).toContain('Apply labels ONLY when information is missing')
      expect(systemPromptMissingInfo).toContain('Choose from the available labels:')
      expect(systemPromptMissingInfo).toContain('{{LABEL_PREFIX}}')
      expect(systemPromptMissingInfo).toContain('===== Available Labels =====')
      expect(systemPromptMissingInfo).toContain('gh label list')
    })

    it('should provide structured JSON response examples', () => {
      expect(systemPromptMissingInfo).toContain('"repro": {')
      expect(systemPromptMissingInfo).toContain('"links":')
      expect(systemPromptMissingInfo).toContain('"steps":')
      expect(systemPromptMissingInfo).toContain('"version":')
      expect(systemPromptMissingInfo).toContain('"environment":')
      expect(systemPromptMissingInfo).toContain('"labels":')
    })

    it('should include examples for both complete and missing information scenarios', () => {
      expect(systemPromptMissingInfo).toContain('Complete information example:')
      expect(systemPromptMissingInfo).toContain('Missing information example:')
    })

    it('should specify JSON-only response format without code blocks', () => {
      expect(systemPromptMissingInfo).toContain('valid JSON format without code blocks')
      expect(systemPromptMissingInfo).toContain('ONLY in valid JSON format')
      expect(systemPromptMissingInfo).toContain('without code blocks or markdown')
    })
  })

  describe('integration with selectLabels function', () => {
    it('should use the missing-info template correctly', async () => {
      await selectLabels('missing-info', mockConfig)

      expect(prompts.generatePrompt).toHaveBeenCalledTimes(2)

      // Verify system prompt generation uses missing-info template
      const systemPromptCall = prompts.generatePrompt.mock.calls[0]
      expect(systemPromptCall[0]).toBe(systemPromptMissingInfo)
      expect(systemPromptCall[1]).toBe(
        path.join('/tmp/missing-info-test/triage-labels/prompts/test-missing-info-guid/system-prompt.md')
      )
    })

    it('should create proper file paths for missing-info template', async () => {
      const result = await selectLabels('missing-info', mockConfig)

      const expectedResponsePath = path.join(
        '/tmp/missing-info-test/triage-assistant/responses/response-test-missing-info-guid.json'
      )
      expect(result).toBe(expectedResponsePath)
    })

    it('should call AI inference with the structured prompt', async () => {
      await selectLabels('missing-info', mockConfig)

      expect(ai.runInference).toHaveBeenCalledTimes(1)

      const inferenceCall = ai.runInference.mock.calls[0]
      const systemPrompt = inferenceCall[0]

      // Verify the system prompt contains our structured extraction instructions
      expect(systemPrompt).toContain('Structured Information to Extract')
      expect(systemPrompt).toContain('repro')
      expect(systemPrompt).toContain('links')
      expect(systemPrompt).toContain('steps')
      expect(systemPrompt).toContain('version')
      expect(systemPrompt).toContain('environment')
    })

    it('should pass correct configuration parameters', async () => {
      const customConfig = {
        ...mockConfig,
        issueNumber: 456,
        repository: 'test/missing-info-repo',
        labelPrefix: 'status/',
        label: 'needs-triage'
      }

      await selectLabels('missing-info', customConfig)

      // Verify replacement values are passed correctly
      const calls = prompts.generatePrompt.mock.calls
      calls.forEach((call) => {
        expect(call[2]).toEqual({
          ISSUE_NUMBER: 456,
          ISSUE_REPO: 'test/missing-info-repo',
          LABEL_PREFIX: 'status/',
          LABEL: 'needs-triage'
        })
      })
    })
  })

  describe('dynamic labels support', () => {
    it('should support dynamic label prefix placeholders', () => {
      expect(systemPromptMissingInfo).toContain('{{LABEL_PREFIX}}')
      expect(systemPromptMissingInfo).toContain('Choose from the available labels:')
      expect(systemPromptMissingInfo).toContain('gh label list')
    })

    it('should use gh command to dynamically list available labels', () => {
      expect(systemPromptMissingInfo).toContain('gh label list --limit 1000 --json name,description')
      expect(systemPromptMissingInfo).toContain('--search "{{LABEL_PREFIX}}"')
      expect(systemPromptMissingInfo).toContain('select(.name | startswith("{{LABEL_PREFIX}}"))')
    })

    it('should pass label prefix to prompt generation when available', async () => {
      const configWithLabelPrefix = {
        ...mockConfig,
        labelPrefix: 'needs-'
      }

      await selectLabels('missing-info', configWithLabelPrefix)

      const systemPromptCall = prompts.generatePrompt.mock.calls[0]
      expect(systemPromptCall[2]).toHaveProperty('LABEL_PREFIX')
      expect(systemPromptCall[2].LABEL_PREFIX).toEqual('needs-')
    })
  })

  describe('expected response structure validation', () => {
    it('should validate complete information response structure', () => {
      // Extract the complete JSON object after the "Complete information example:" text
      const fullJsonMatch = systemPromptMissingInfo.match(/Complete information example:\s*(\{[\s\S]*?\n\})/)?.[1]
      expect(fullJsonMatch).toBeDefined()

      const parsed = JSON.parse(fullJsonMatch!)
      expect(parsed).toHaveProperty('repro')
      expect(parsed.repro).toHaveProperty('links')
      expect(parsed.repro).toHaveProperty('steps')
      expect(parsed.repro).toHaveProperty('version')
      expect(parsed.repro).toHaveProperty('environment')
      expect(Array.isArray(parsed.repro.links)).toBe(true)
      expect(Array.isArray(parsed.repro.steps)).toBe(true)
      expect(typeof parsed.repro.version).toBe('string')
      expect(typeof parsed.repro.environment).toBe('string')
    })

    it('should validate missing information response structure', () => {
      // Extract the complete JSON object after the "Missing information example:" text
      const fullJsonMatch = systemPromptMissingInfo.match(/Missing information example:\s*(\{[\s\S]*?\n\})/)?.[1]
      expect(fullJsonMatch).toBeDefined()

      const parsed = JSON.parse(fullJsonMatch!)
      expect(parsed).toHaveProperty('repro')
      expect(parsed).toHaveProperty('labels')
      expect(parsed.repro).toHaveProperty('links')
      expect(parsed.repro).toHaveProperty('steps')
      expect(parsed.repro).toHaveProperty('version')
      expect(parsed.repro).toHaveProperty('environment')
      expect(Array.isArray(parsed.labels)).toBe(true)

      // Validate label structure
      parsed.labels.forEach((label: { label: string; reason: string }) => {
        expect(label).toHaveProperty('label')
        expect(label).toHaveProperty('reason')
        expect(typeof label.label).toBe('string')
        expect(typeof label.reason).toBe('string')
      })
    })

    it('should include expected label types in examples', () => {
      expect(systemPromptMissingInfo).toContain('"s/needs-repro"')
      expect(systemPromptMissingInfo).toContain('"s/needs-info"')
      expect(systemPromptMissingInfo).toContain('No reproduction steps provided')
      expect(systemPromptMissingInfo).toContain('Version information missing')
    })
  })

  describe('error handling', () => {
    it('should propagate directory creation errors', async () => {
      jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('Permission denied'))

      await expect(selectLabels('missing-info', mockConfig)).rejects.toThrow('Permission denied')
    })

    it('should propagate generatePrompt errors', async () => {
      prompts.generatePrompt.mockRejectedValueOnce(new Error('Template processing failed'))

      await expect(selectLabels('missing-info', mockConfig)).rejects.toThrow('Template processing failed')
    })

    it('should propagate runInference errors', async () => {
      ai.runInference.mockRejectedValue(new Error('AI inference failed'))

      await expect(selectLabels('missing-info', mockConfig)).rejects.toThrow('AI inference failed')
    })
  })

  describe('label assignment logic validation', () => {
    it('should specify that labels should only be applied when information is missing', () => {
      expect(systemPromptMissingInfo).toContain('Apply labels ONLY when information is missing')
    })

    it('should allow multiple labels when multiple types of info are missing', () => {
      expect(systemPromptMissingInfo).toContain('multiple labels')
      expect(systemPromptMissingInfo).toContain('multiple types of information are missing')
    })

    it('should specify no labels when all information is present', () => {
      expect(systemPromptMissingInfo).toContain('no labels')
      expect(systemPromptMissingInfo).toContain('all essential information is present')
    })
  })
})
