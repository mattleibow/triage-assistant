/**
 * Unit tests for missing info integration in triage workflow
 */
import { jest } from '@jest/globals'
import { FileSystemMock } from '../helpers/filesystem-mock.js'
import { MissingInfoPayload, TriageResponse } from '../../src/triage/triage-response.js'

// Import the module being tested
const { mergeResponses } = await import('../../src/triage/merge.js')

describe('Missing Info Triage Integration', () => {
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

  describe('response merging and structure detection', () => {
    it('should correctly merge missing-info response files', async () => {
      const response1: Partial<MissingInfoPayload> = {
        summary: 'App crash issue',
        repro: {
          has_clear_description: true,
          has_steps: false,
          has_code: false,
          links: []
        }
      }

      const response2: Partial<MissingInfoPayload> = {
        missing: ['steps', 'code'],
        questions: ['How do you reproduce this crash?'],
        labels: [{ label: 's/needs-info', reason: 'Missing reproduction steps' }]
      }

      const responsesDir = '/tmp/test/triage-assistant/responses'
      const outputFile = '/tmp/test/triage-assistant/merged.json'
      const responseFile1 = `${responsesDir}/response1.json`
      const responseFile2 = `${responsesDir}/response2.json`

      inMemoryFs.forceSet(responseFile1, JSON.stringify(response1))
      inMemoryFs.forceSet(responseFile2, JSON.stringify(response2))

      const mergedResponse = await mergeResponses('', responsesDir, outputFile)

      // Verify the response has missing-info structure
      expect(mergedResponse).toHaveProperty('summary', 'App crash issue')
      expect(mergedResponse).toHaveProperty('repro')
      expect(mergedResponse).toHaveProperty('missing')
      expect(mergedResponse).toHaveProperty('questions')
      expect(mergedResponse).toHaveProperty('labels')

      // Verify merged content
      expect(mergedResponse.summary).toBe('App crash issue')
      expect(mergedResponse.missing).toEqual(['steps', 'code'])
      expect(mergedResponse.questions).toEqual(['How do you reproduce this crash?'])
      expect(mergedResponse.labels).toEqual([{ label: 's/needs-info', reason: 'Missing reproduction steps' }])

      // Verify repro structure
      expect(mergedResponse.repro).toEqual({
        has_clear_description: true,
        has_steps: false,
        has_code: false,
        links: []
      })
    })

    it('should handle regular triage response structure', async () => {
      const regularResponse: TriageResponse = {
        remarks: ['This looks like a bug'],
        regression: null,
        labels: [
          { label: 'bug', reason: 'This is a bug report' },
          { label: 'priority/high', reason: 'High priority issue' }
        ]
      }

      const responsesDir = '/tmp/test/triage-assistant/responses'
      const outputFile = '/tmp/test/triage-assistant/merged.json'
      const responseFile = `${responsesDir}/response.json`

      inMemoryFs.forceSet(responseFile, JSON.stringify(regularResponse))

      const mergedResponse = await mergeResponses('', responsesDir, outputFile)

      // Verify the response has regular triage structure
      expect(mergedResponse).toHaveProperty('remarks')
      expect(mergedResponse).toHaveProperty('regression')
      expect(mergedResponse).toHaveProperty('labels')

      // Should not have missing-info specific fields
      expect(mergedResponse).not.toHaveProperty('summary')
      expect(mergedResponse).not.toHaveProperty('repro')
      expect(mergedResponse).not.toHaveProperty('missing')
      expect(mergedResponse).not.toHaveProperty('questions')

      expect(mergedResponse.remarks).toEqual(['This looks like a bug'])
      expect(mergedResponse.labels).toEqual([
        { label: 'bug', reason: 'This is a bug report' },
        { label: 'priority/high', reason: 'High priority issue' }
      ])
    })

    it('should handle response with overlapping arrays correctly', async () => {
      const response1 = {
        labels: [{ label: 'bug', reason: 'First bug' }],
        missing: ['steps']
      }

      const response2 = {
        labels: [{ label: 's/needs-info', reason: 'Missing info' }],
        missing: ['code']
      }

      const responsesDir = '/tmp/test/triage-assistant/responses'
      const outputFile = '/tmp/test/triage-assistant/merged.json'
      const responseFile1 = `${responsesDir}/response1.json`
      const responseFile2 = `${responsesDir}/response2.json`

      inMemoryFs.forceSet(responseFile1, JSON.stringify(response1))
      inMemoryFs.forceSet(responseFile2, JSON.stringify(response2))

      const mergedResponse = await mergeResponses('', responsesDir, outputFile)

      // Arrays should be concatenated
      expect(mergedResponse.labels).toEqual([
        { label: 'bug', reason: 'First bug' },
        { label: 's/needs-info', reason: 'Missing info' }
      ])
      expect(mergedResponse.missing).toEqual(['steps', 'code'])
    })

    it('should handle empty responses directory gracefully', async () => {
      const responsesDir = '/tmp/test/triage-assistant/responses'
      const outputFile = '/tmp/test/triage-assistant/merged.json'

      // Don't create any files in the responses directory

      await expect(mergeResponses('', responsesDir, outputFile)).rejects.toThrow(
        'No input files specified for merging responses'
      )
    })

    it('should handle malformed JSON files gracefully', async () => {
      const responsesDir = '/tmp/test/triage-assistant/responses'
      const outputFile = '/tmp/test/triage-assistant/merged.json'
      const responseFile1 = `${responsesDir}/valid.json`
      const responseFile2 = `${responsesDir}/invalid.json`

      // Create one valid and one invalid JSON file
      inMemoryFs.forceSet(
        responseFile1,
        JSON.stringify({
          summary: 'Valid response',
          labels: [{ label: 'test', reason: 'test' }]
        })
      )
      inMemoryFs.forceSet(responseFile2, '{ invalid json }')

      const mergedResponse = await mergeResponses('', responsesDir, outputFile)

      // Should process valid file and skip invalid one
      expect(mergedResponse.summary).toBe('Valid response')
      expect(mergedResponse.labels).toEqual([{ label: 'test', reason: 'test' }])
    })
  })
})
