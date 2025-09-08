import * as fs from 'fs'
import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested
import { selectLabels } from '../../src/prompts/select-labels.js'
import { TriageResponse } from '../../src/triage/triage-response.js'

describe('GitHub Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  if (!process.env.GITHUB_TOKEN || !process.env.AI_TOKEN) {
    it('should not run tests without GITHUB_TOKEN and AI_TOKEN', () => {
      expect(true).toBe(true)
    })
  } else {
    describe('selectLabels', () => {
      const mockConfig = {
        dryRun: false,
        aiEndpoint: 'https://models.github.ai/inference',
        aiModel: 'openai/gpt-4o-mini',
        aiToken: process.env.AI_TOKEN!,
        repository: 'mattleibow/triage-assistant',
        token: process.env.GITHUB_TOKEN!,
        tempDir: '/tmp'
      }

      it('with single-label returns correct response', async () => {
        const result = await selectLabels('single-label', {
          ...mockConfig,
          labelPrefix: 'area-',
          issueNumber: 32
        })

        const resultContents = await fs.promises.readFile(result, 'utf-8')
        const response = JSON.parse(resultContents) as TriageResponse

        expect(response.remarks).toBe(undefined)
        expect(response.labels).toEqual([{ label: 'area-testing', reason: expect.any(String) }])
      })

      it('with multi-label returns correct response', async () => {
        const result = await selectLabels('multi-label', {
          ...mockConfig,
          labelPrefix: 'overlap-',
          issueNumber: 33
        })

        const resultContents = await fs.promises.readFile(result, 'utf-8')
        const response = JSON.parse(resultContents) as TriageResponse

        expect(response.remarks).toBe(undefined)
        expect(response.labels).toStrictEqual([
          { label: 'overlap-ai', reason: expect.any(String) },
          { label: 'overlap-prompts', reason: expect.any(String) }
        ])
      })

      describe('with missing-info returns correct response', () => {
        it('for issue with missing info', async () => {
          const result = await selectLabels('missing-info', {
            ...mockConfig,
            labelPrefix: 'needs-',
            issueNumber: 32
          })

          const resultContents = await fs.promises.readFile(result, 'utf-8')
          const response = JSON.parse(resultContents) as TriageResponse

          expect(response.remarks).toEqual([expect.any(String)])
          expect(response.labels).toEqual([{ label: 'needs-info', reason: expect.any(String) }])
        })

        it('for issue with sufficient info', async () => {
          const result = await selectLabels('missing-info', {
            ...mockConfig,
            labelPrefix: 'needs-',
            issueNumber: 84
          })

          const resultContents = await fs.promises.readFile(result, 'utf-8')
          const response = JSON.parse(resultContents) as TriageResponse

          expect(response.remarks).toEqual([expect.any(String)])
          expect(response.repro).toStrictEqual({
            links: ['https://github.com/mattleibow/triage-assistant'],
            steps: ['Install Triager package', 'Load up the UI', 'Login', 'Enter issue to triage', 'Observe a crash'],
            version: 'v2',
            environment: 'Windows'
          })
        })
      })
    })
  }
})
