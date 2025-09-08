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
})
