import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import { GraphQLClient } from 'graphql-request'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested
import { getProjectDetails, getProjectField } from '../../src/github/projects.js'
import { getIssueDetails } from '../../src/github/issues.js'
import { getSdk } from '../../src/generated/graphql.js'

describe('GitHub Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  if (!process.env.GITHUB_TOKEN) {
    it('should not run tests without GITHUB_TOKEN', () => {
      expect(true).toBe(true)
    })
  } else {
    const graphql = new GraphQLClient('https://api.github.com/graphql', {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
      }
    })
    const sdk = getSdk(graphql)

    describe('getProjectField', () => {
      it('getProjectField returns field info if found', async () => {
        const result = await getProjectField(sdk, 'mattleibow', 'triage-assistant', 8, 'Engagement Score')

        expect(result).toEqual({ id: 'PVTF_lAHOABC7qM4A-32IzgyVxkI', name: 'Engagement Score' })
      })

      it('getProjectField returns null if field not found', async () => {
        const result = await getProjectField(sdk, 'mattleibow', 'triage-assistant', 8, 'Missing')

        expect(result).toBeNull()
      })
    })

    describe('getProjectDetails', () => {
      it('getProjectDetails returns all items', async () => {
        const result = await getProjectDetails(sdk, 'mattleibow', 'triage-assistant', 8)

        expect(result.items.length).toBe(2)

        expect(result.items[0].id).toBe('PVTI_lAHOABC7qM4A-32Izgc_eaQ')
        expect(result.items[0].content.id).toBe('I_kwDOOy552s7ComT5')

        expect(result.items[1].id).toBe('PVTI_lAHOABC7qM4A-32Izgc_fjo')
        expect(result.items[1].content.id).toBe('I_kwDOOy552s7Cos4Q')
      })
    })

    describe('getIssueDetails', () => {
      it('getIssueDetails returns issue details', async () => {
        const result = await getIssueDetails(sdk, 'mattleibow', 'triage-assistant', 32)

        expect(result.id).toBe('I_kwDOOy552s7ComT5')
        expect(result.number).toBe(32)
        expect(result.title).toBe('An issue for the unit tests')
        expect(result.owner).toBe('mattleibow')
        expect(result.repo).toBe('triage-assistant')
      })
    })
  }
})
