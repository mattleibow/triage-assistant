/**
 * Unit tests for the select label prompt generation functionality, src/prompts-select-labels.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'
import * as exec from '../__fixtures__/exec.js'
import * as prompts from '../__fixtures__/prompts.js'
import * as ai from '../__fixtures__/ai.js'
import * as fs from 'fs'
import * as path from 'path'
import { SelectLabelsPromptConfig } from '../src/triage-config.js'
import { FileSystemMock } from './helpers/filesystem-mock.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('../src/prompts.js', () => prompts)
jest.unstable_mockModule('../src/ai.js', () => ai)
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'test-guid-123')
}))

// Import the module being tested and mocked dependencies
const { selectLabels } = await import('../src/prompts-select-labels.js')
const { getPrompt, TEMPLATE_NAMES } = await import('../src/prompts/select-labels/index.js')

describe('selectLabels', () => {
  const mockConfig: SelectLabelsPromptConfig = {
    aiEndpoint: 'https://test-ai-endpoint.com',
    aiModel: 'test-model',
    aiToken: 'test-ai-token',
    token: 'test-token',
    tempDir: '/tmp/test',
    issueNumber: 123,
    repoOwner: 'owner',
    repoName: 'repo',
    repository: 'owner/repo',
    labelPrefix: 'type/',
    label: 'bug',
    template: 'single-label'
  }

  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock the file system operations
    inMemoryFs.setup()

    // Mock generatePrompt to simulate the real behavior: process template and write to file
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

  describe('template loading and prompt generation', () => {
    it('should load the correct template and call generatePrompt with correct parameters', async () => {
      await selectLabels(mockConfig)

      // Verify generatePrompt was called twice (system and user prompts)
      expect(prompts.generatePrompt).toHaveBeenCalledTimes(2)

      // Verify system prompt generation
      {
        const systemPromptPath = path.join('/tmp/test/triage-labels/prompts/test-guid-123/system-prompt.md')
        expect(prompts.generatePrompt).toHaveBeenNthCalledWith(
          1,
          getPrompt('single-label'),
          path.join('/tmp/test/triage-labels/prompts/test-guid-123/system-prompt.md'),
          {
            ISSUE_NUMBER: 123,
            ISSUE_REPO: 'owner/repo',
            LABEL_PREFIX: 'type/',
            LABEL: 'bug'
          },
          mockConfig
        )
        expect(inMemoryFs.has(systemPromptPath)).toBe(true)
        expect(inMemoryFs.get(systemPromptPath)).toContain('assign a single best label')
      }

      // Verify user prompt generation
      {
        const userPromptPath = path.join('/tmp/test/triage-labels/prompts/test-guid-123/user-prompt.md')
        expect(prompts.generatePrompt).toHaveBeenNthCalledWith(
          2,
          getPrompt('user'),
          path.join('/tmp/test/triage-labels/prompts/test-guid-123/user-prompt.md'),
          {
            ISSUE_NUMBER: 123,
            ISSUE_REPO: 'owner/repo',
            LABEL_PREFIX: 'type/',
            LABEL: 'bug'
          },
          mockConfig
        )
        expect(inMemoryFs.has(userPromptPath)).toBe(true)
        expect(inMemoryFs.get(userPromptPath)).toContain('A new issue has arrived')
      }
    })

    // Test each template type individually for better error visibility
    describe('template handling', () => {
      const templates = TEMPLATE_NAMES.filter((t) => t !== 'user')

      templates.forEach((template) => {
        it(`should handle ${template} template correctly`, async () => {
          const config = { ...mockConfig, template }

          await selectLabels(config)

          // Verify the correct template was loaded
          expect(prompts.generatePrompt).toHaveBeenCalledWith(
            getPrompt(template),
            path.join('/tmp/test/triage-labels/prompts/test-guid-123/system-prompt.md'),
            {
              ISSUE_NUMBER: 123,
              ISSUE_REPO: 'owner/repo',
              LABEL_PREFIX: 'type/',
              LABEL: 'bug'
            },
            config
          )
        })
      })
    })

    it('should pass correct replacement values for different configs', async () => {
      const customConfig = {
        ...mockConfig,
        issueNumber: 456,
        repository: 'myorg/myrepo',
        labelPrefix: 'priority/',
        label: 'high',
        template: 'multi-label'
      }

      await selectLabels(customConfig)

      // Check both system and user prompt calls get the same replacements
      const calls = prompts.generatePrompt.mock.calls

      calls.forEach((call) => {
        expect(call[2]).toEqual({
          ISSUE_NUMBER: 456,
          ISSUE_REPO: 'myorg/myrepo',
          LABEL_PREFIX: 'priority/',
          LABEL: 'high'
        })
      })
    })
  })

  describe('directory creation and file paths', () => {
    it('should create the correct directory structure', async () => {
      const mkdirSpy = jest.spyOn(fs.promises, 'mkdir')

      await selectLabels(mockConfig)

      expect(mkdirSpy).toHaveBeenCalledWith(path.join('/tmp/test/triage-labels/prompts/test-guid-123'), {
        recursive: true
      })
      expect(mkdirSpy).toHaveBeenCalledWith(path.join('/tmp/test/triage-assistant/responses'), { recursive: true })
    })

    it('should generate unique directory paths for each call', async () => {
      // Import the uuid module to access the mock
      const { v4: uuidV4 } = await import('uuid')
      const uuidMock = uuidV4 as jest.MockedFunction<typeof uuidV4>

      // Reset and configure the existing mock to return different values
      uuidMock.mockClear()
      uuidMock.mockReturnValueOnce('guid-1').mockReturnValueOnce('guid-2')

      const mkdirSpy = jest.spyOn(fs.promises, 'mkdir')
      mkdirSpy.mockClear()

      await selectLabels(mockConfig)
      await selectLabels(mockConfig)

      // Verify different directories were created
      expect(mkdirSpy).toHaveBeenCalledWith(path.join('/tmp/test/triage-labels/prompts/guid-1'), { recursive: true })
      expect(mkdirSpy).toHaveBeenCalledWith(path.join('/tmp/test/triage-labels/prompts/guid-2'), { recursive: true })
    })
  })

  describe('AI inference integration', () => {
    it('should call runInference with correct parameters', async () => {
      const responsePath = path.join('/tmp/test/triage-assistant/responses/response-test-guid-123.json')

      const result = await selectLabels(mockConfig)

      expect(ai.runInference).toHaveBeenCalledTimes(1)
      expect(ai.runInference).toHaveBeenCalledWith(
        expect.stringContaining('assign a single best label to new issues'),
        expect.stringContaining('A new issue has arrived'),
        responsePath,
        200,
        mockConfig
      )

      // Verify the correct response file path is returned
      expect(result).toBe(responsePath)
    })

    it('should pass the full config object to runInference', async () => {
      await selectLabels(mockConfig)

      const inferenceCall = ai.runInference.mock.calls[0]
      expect(inferenceCall[4]).toBe(mockConfig) // Full config object should be passed
    })

    it('should handle file reading errors gracefully', async () => {
      jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File not found'))

      await expect(selectLabels(mockConfig)).rejects.toThrow('File not found')
    })
  })

  describe('error handling', () => {
    it('should propagate directory creation errors', async () => {
      jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('Permission denied'))

      await expect(selectLabels(mockConfig)).rejects.toThrow('Permission denied')
    })

    it('should propagate generatePrompt errors', async () => {
      prompts.generatePrompt.mockRejectedValueOnce(new Error('Template processing failed'))

      await expect(selectLabels(mockConfig)).rejects.toThrow('Template processing failed')
    })

    it('should propagate runInference errors', async () => {
      ai.runInference.mockRejectedValue(new Error('AI inference failed'))

      await expect(selectLabels(mockConfig)).rejects.toThrow('AI inference failed')
    })
  })

  describe('template validation', () => {
    it('should work with all valid template names', async () => {
      const validTemplates = ['single-label', 'multi-label', 'regression', 'missing-info']

      for (const template of validTemplates) {
        const config = { ...mockConfig, template }

        // Should not throw for valid templates
        await expect(selectLabels(config)).resolves.toBeDefined()

        jest.clearAllMocks()

        prompts.generatePrompt.mockResolvedValue('content')
        ai.runInference.mockResolvedValue(undefined)
      }
    })
  })
})
