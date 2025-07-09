/**
 * Unit tests for the apply functionality, src/apply.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as ai from '../__fixtures__/ai.js'
import * as core from '../__fixtures__/actions-core.js'
import * as github from '../__fixtures__/actions-github.js'
import { jest } from '@jest/globals'
import { FileSystemMock } from '../__tests__/helpers/filesystem-mock.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../src/ai.js', () => ai)

// Import the module being tested
const { mergeResponses, generateSummary } = await import('../src/summary.js')

describe('summary', () => {
  const testMergedResponseFile = '/tmp/test/merged-response.json'
  const testResponsesDir = '/tmp/test/responses'

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

  describe('mergeResponses', () => {
    describe('input file processing', () => {
      it('should process comma-separated input files', async () => {
        const inputFiles = `${testResponsesDir}/file1.json,${testResponsesDir}/file2.json,${testResponsesDir}/file3.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file1.json'),
          JSON.stringify({ labels: [{ label: 'bug', reason: 'Contains error' }] })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file2.json'),
          JSON.stringify({ labels: [{ label: 'priority-high', reason: 'Critical issue' }] })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file3.json'),
          JSON.stringify({
            regression: {
              'working-version': '1.0',
              'broken-version': '1.1',
              evidence: 'Test fails'
            }
          })
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(fs.promises.readFile).toHaveBeenCalledTimes(3)
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'file1.json'), 'utf8')
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'file2.json'), 'utf8')
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'file3.json'), 'utf8')

        expect(result.labels).toHaveLength(2)
        expect(result.labels).toContainEqual({
          label: 'bug',
          reason: 'Contains error'
        })
        expect(result.labels).toContainEqual({
          label: 'priority-high',
          reason: 'Critical issue'
        })
        expect(result.regression).toEqual({
          'working-version': '1.0',
          'broken-version': '1.1',
          evidence: 'Test fails'
        })
      })

      it('should process newline-separated input files', async () => {
        const inputFiles = `${testResponsesDir}/file1.json\n${testResponsesDir}/file2.json\r\n${testResponsesDir}/file3.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file1.json'),
          JSON.stringify({ labels: [{ label: 'documentation', reason: 'Missing docs' }] })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file2.json'),
          JSON.stringify({ labels: [{ label: 'enhancement', reason: 'Feature request' }] })
        )
        inMemoryFs.forceSet(path.join(testResponsesDir, 'file3.json'), JSON.stringify({ customField: 'test-value' }))

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(fs.promises.readFile).toHaveBeenCalledTimes(3)
        expect(result.labels).toHaveLength(2)
        expect(result.customField).toBe('test-value')
      })

      it('should process all JSON files from response directory when inputFiles is null', async () => {
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'response1.json'),
          JSON.stringify({ labels: [{ label: 'type-bug', reason: 'Error found' }] })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'response2.json'),
          JSON.stringify({
            regression: {
              'working-version': '2.0',
              'broken-version': '2.1',
              evidence: 'Regression detected'
            }
          })
        )
        inMemoryFs.forceSet(path.join(testResponsesDir, 'other.txt'), 'Random file content that should be ignored')
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'response3.json'),
          JSON.stringify({ labels: [{ label: 'priority-low', reason: 'Minor issue' }] })
        )

        const result = await mergeResponses(null, testResponsesDir, testMergedResponseFile)

        expect(fs.promises.readdir).toHaveBeenCalledWith(path.join(testResponsesDir))
        expect(fs.promises.readFile).toHaveBeenCalledTimes(3)
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'response1.json'), 'utf8')
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'response2.json'), 'utf8')
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'response3.json'), 'utf8')

        expect(result.labels).toHaveLength(2)
        expect(result.regression).toEqual({
          'working-version': '2.0',
          'broken-version': '2.1',
          evidence: 'Regression detected'
        })
      })

      it('should filter out empty and whitespace-only file paths', async () => {
        const inputFiles = `${testResponsesDir}/file1.json, , ${testResponsesDir}/file2.json,\n\n,${testResponsesDir}/file3.json,   `
        const mockData = { labels: [{ label: 'test', reason: 'test reason' }] }

        inMemoryFs.forceSet(path.join(testResponsesDir, 'file1.json'), JSON.stringify(mockData))
        inMemoryFs.forceSet(path.join(testResponsesDir, 'file2.json'), JSON.stringify(mockData))
        inMemoryFs.forceSet(path.join(testResponsesDir, 'file3.json'), JSON.stringify(mockData))

        await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(fs.promises.readFile).toHaveBeenCalledTimes(3)
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'file1.json'), 'utf8')
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'file2.json'), 'utf8')
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(testResponsesDir, 'file3.json'), 'utf8')
      })
    })

    describe('content processing', () => {
      it('should remove wrapping code blocks from file content', async () => {
        const inputFiles = `${testResponsesDir}/test.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'test.json'),
          '```json\n{"labels": [{"label": "bug", "reason": "test"}]}\n```'
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(result.labels).toHaveLength(1)
        expect(result.labels?.[0]).toEqual({ label: 'bug', reason: 'test' })
      })

      it('should handle files without code block wrapping', async () => {
        const inputFiles = `${testResponsesDir}/test.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'test.json'),
          '{"labels": [{"label": "enhancement", "reason": "new feature"}]}'
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(result.labels).toHaveLength(1)
        expect(result.labels?.[0]).toEqual({
          label: 'enhancement',
          reason: 'new feature'
        })
      })

      it('should filter out empty lines when removing code blocks', async () => {
        const inputFiles = `${testResponsesDir}/test.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'test.json'),
          '```json\n\n{"labels": [{"label": "bug", "reason": "test"}]}\n\n\n```'
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(result.labels).toHaveLength(1)
        expect(result.labels?.[0]).toEqual({ label: 'bug', reason: 'test' })
      })
    })

    describe('merging logic', () => {
      it('should merge arrays by concatenating them', async () => {
        const inputFiles = `${testResponsesDir}/file1.json,${testResponsesDir}/file2.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file1.json'),
          JSON.stringify({
            labels: [{ label: 'bug', reason: 'Error' }]
          })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file2.json'),
          JSON.stringify({
            labels: [{ label: 'enhancement', reason: 'Feature' }]
          })
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(result.labels).toHaveLength(2)
        expect(result.labels).toContainEqual({
          label: 'bug',
          reason: 'Error'
        })
        expect(result.labels).toContainEqual({
          label: 'enhancement',
          reason: 'Feature'
        })
      })

      it('should overwrite non-array values with later values', async () => {
        const inputFiles = `${testResponsesDir}/file1.json,${testResponsesDir}/file2.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file1.json'),
          JSON.stringify({
            regression: {
              'working-version': '1.0',
              'broken-version': '1.1',
              evidence: 'First evidence'
            }
          })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file2.json'),
          JSON.stringify({
            regression: {
              'working-version': '2.0',
              'broken-version': '2.1',
              evidence: 'Second evidence'
            }
          })
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(result.regression).toEqual({
          'working-version': '2.0',
          'broken-version': '2.1',
          evidence: 'Second evidence'
        })
      })

      it('should handle mixed data types correctly', async () => {
        const inputFiles = `${testResponsesDir}/file1.json,${testResponsesDir}/file2.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file1.json'),
          JSON.stringify({
            labels: [{ label: 'bug', reason: 'Error' }],
            regression: {
              'working-version': '1.0',
              'broken-version': '1.1',
              evidence: 'Evidence'
            },
            customField: 'value1'
          })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file2.json'),
          JSON.stringify({
            labels: [{ label: 'enhancement', reason: 'Feature' }],
            customField: 'value2',
            anotherField: 'new value'
          })
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(result.labels).toHaveLength(2)
        expect(result.regression).toEqual({
          'working-version': '1.0',
          'broken-version': '1.1',
          evidence: 'Evidence'
        })
        expect(result.customField).toBe('value2')
        expect(result.anotherField).toBe('new value')
      })
    })

    describe('file operations', () => {
      it('should create output directory and write merged response', async () => {
        const inputFiles = `${testResponsesDir}/test.json`

        const mockData = { labels: [{ label: 'test', reason: 'test reason' }] }

        inMemoryFs.forceSet(path.join(testResponsesDir, 'test.json'), JSON.stringify(mockData))

        await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(testMergedResponseFile), { recursive: true })
        expect(fs.promises.writeFile).toHaveBeenCalledWith(testMergedResponseFile, JSON.stringify(mockData, null, 2))
      })

      it('should skip non-existent files gracefully', async () => {
        const inputFiles = `${testResponsesDir}/file1.json,${testResponsesDir}/nonexistent.json,${testResponsesDir}/file2.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file1.json'),
          JSON.stringify({ labels: [{ label: 'bug', reason: 'Error' }] })
        )
        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'file2.json'),
          JSON.stringify({
            labels: [{ label: 'enhancement', reason: 'Feature' }]
          })
        )

        const result = await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(fs.promises.readFile).toHaveBeenCalledTimes(3)
        expect(result.labels).toHaveLength(2)
      })

      it('should log processing information', async () => {
        const inputFiles = `${testResponsesDir}/test.json`

        inMemoryFs.forceSet(
          path.join(testResponsesDir, 'test.json'),
          JSON.stringify({ labels: [{ label: 'test', reason: 'test reason' }] })
        )

        await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(core.info).toHaveBeenCalledWith(`Merging files: ${path.join(testResponsesDir, 'test.json')}`)
        expect(core.info).toHaveBeenCalledWith(`Processing file: ${path.join(testResponsesDir, 'test.json')}`)
      })
    })

    describe('error handling', () => {
      it('should throw error when no input files are specified', async () => {
        await expect(mergeResponses('', testResponsesDir, testMergedResponseFile)).rejects.toThrow(
          'No input files specified for merging responses'
        )
      })

      it('should throw error when response directory does not exist and no input files provided', async () => {
        await expect(mergeResponses(null, testResponsesDir, testMergedResponseFile)).rejects.toThrow(
          'No input files specified for merging responses'
        )
      })

      it('should propagate JSON parsing errors', async () => {
        const inputFiles = `${testResponsesDir}/invalid.json`

        inMemoryFs.forceSet(path.join(testResponsesDir, 'invalid.json'), '{"invalid": json}')

        await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(core.warning).toHaveBeenCalledWith(
          `Failed to read or parse file: ${path.join(testResponsesDir, 'invalid.json')}`
        )
      })

      it('should propagate file reading errors', async () => {
        const inputFiles = `${testResponsesDir}/test.json`

        await mergeResponses(inputFiles, testResponsesDir, testMergedResponseFile)

        expect(core.warning).toHaveBeenCalledWith(
          `Failed to read or parse file: ${path.join(testResponsesDir, 'test.json')}`
        )
      })
    })
  })

  describe('generateSummary', () => {
    const mockConfig = {
      tempDir: '/tmp/test',
      issueNumber: 123,
      repository: 'owner/repo',
      repoName: 'repo',
      repoOwner: 'owner',
      token: 'test-token',
      aiEndpoint: 'test-endpoint',
      aiModel: 'test-model'
    }

    const expectedSummaryDir = path.join(mockConfig.tempDir, 'triage-apply', 'prompts')
    const expectedSystemPromptPath = path.join(expectedSummaryDir, 'system-prompt.md')
    const expectedUserPromptPath = path.join(expectedSummaryDir, 'user-prompt.md')
    const expectedResponseDir = path.join(mockConfig.tempDir, 'triage-apply', 'responses')
    const expectedResponseFile = path.join(mockConfig.tempDir, 'triage-apply', 'responses', 'response.md')

    beforeEach(() => {
      // Mock generatePrompt to simulate the real behavior: process template and write to file
      ai.generatePrompt.mockImplementation(async (template, outputPath) => {
        const processedContent = template.toString()
        if (outputPath) {
          await fs.promises.writeFile(outputPath, processedContent)
        }
        return processedContent
      })

      // Mock runInference to simulate AI inference
      ai.runInference.mockResolvedValue(undefined)
    })

    it('should create necessary directories and generate prompts', async () => {
      await generateSummary(mockConfig, testMergedResponseFile)

      // Verify directories are created
      expect(fs.promises.mkdir).toHaveBeenCalledWith(expectedSummaryDir, { recursive: true })
      expect(fs.promises.mkdir).toHaveBeenCalledWith(expectedResponseDir, { recursive: true })

      // Verify prompts are generated
      expect(ai.generatePrompt).toHaveBeenCalledTimes(2)

      // Verify system prompt generation
      expect(ai.generatePrompt).toHaveBeenCalledWith(
        expect.stringContaining('summarize some actions and then prove to the user'),
        expectedSystemPromptPath,
        {
          ISSUE_NUMBER: '123',
          ISSUE_REPO: 'owner/repo',
          MERGED_JSON: testMergedResponseFile
        },
        mockConfig
      )

      // Verify user prompt generation
      expect(ai.generatePrompt).toHaveBeenCalledWith(
        expect.stringContaining('Please summarize the results of this triage.'),
        expectedUserPromptPath,
        {
          ISSUE_NUMBER: '123',
          ISSUE_REPO: 'owner/repo',
          MERGED_JSON: testMergedResponseFile
        },
        mockConfig
      )
    })

    it('should run inference with correct prompts', async () => {
      const result = await generateSummary(mockConfig, testMergedResponseFile)

      // Verify AI inference is called
      expect(ai.runInference).toHaveBeenCalledWith(
        expect.stringContaining('summarize some actions and then prove to the user'),
        expect.stringContaining('Please summarize the results of this triage.'),
        expectedResponseFile,
        500,
        mockConfig
      )

      // Verify return value
      expect(result).toBe(expectedResponseFile)
    })

    it('should handle different issue numbers and repositories', async () => {
      const customConfig = {
        ...mockConfig,
        issueNumber: 456,
        repository: 'different-owner/different-repo'
      }

      await generateSummary(customConfig, testMergedResponseFile)

      // Verify the issue number and repository are passed correctly
      expect(ai.generatePrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          ISSUE_NUMBER: '456',
          ISSUE_REPO: 'different-owner/different-repo',
          MERGED_JSON: testMergedResponseFile
        }),
        customConfig
      )
    })

    it('should use correct file paths based on config.tempDir', async () => {
      const customConfig = {
        ...mockConfig,
        tempDir: '/custom/temp/path'
      }

      const result = await generateSummary(customConfig, testMergedResponseFile)

      const expectedSummaryDir = '/custom/temp/path/triage-apply/prompts'
      const expectedResponseFile = '/custom/temp/path/triage-apply/responses/response.md'

      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.join(expectedSummaryDir), { recursive: true })
      expect(result).toBe(path.join(expectedResponseFile))
    })

    it('should propagate errors from AI operations', async () => {
      ai.generatePrompt.mockRejectedValue(new Error('AI operation failed'))

      await expect(generateSummary(mockConfig, testMergedResponseFile)).rejects.toThrow('AI operation failed')
    })

    it('should propagate errors from file system operations', async () => {
      jest.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('Failed to create directory'))

      await expect(generateSummary(mockConfig, testMergedResponseFile)).rejects.toThrow('Failed to create directory')
    })

    it('should propagate errors from runInference', async () => {
      ai.runInference.mockRejectedValue(new Error('Inference failed'))

      await expect(generateSummary(mockConfig, testMergedResponseFile)).rejects.toThrow('Inference failed')
    })
  })
})
