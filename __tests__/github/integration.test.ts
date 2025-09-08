import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import { GraphQLClient } from 'graphql-request'
import * as github from '@actions/github'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested
import { getProjectDetails, getProjectField } from '../../src/github/projects.js'
import { getIssueDetails, searchIssues } from '../../src/github/issues.js'
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

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN)

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

        expect(result.items.length).toBeGreaterThan(8)

        expect(result.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'PVTI_lAHOABC7qM4A-32Izgc_eaQ',
              content: expect.objectContaining({ id: 'I_kwDOOy552s7ComT5' })
            }),
            expect.objectContaining({
              id: 'PVTI_lAHOABC7qM4A-32Izgc_fjo',
              content: expect.objectContaining({ id: 'I_kwDOOy552s7Cos4Q' })
            })
          ])
        )
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

    describe('searchIssues', () => {
      it('searchIssues returns issue details', async () => {
        const result = await searchIssues(
          octokit,
          'is:issue created:2025-07-25..2025-07-26',
          'mattleibow',
          'triage-assistant'
        )

        expect(result).toStrictEqual([
          {
            id: '3265449488',
            owner: 'mattleibow',
            repo: 'triage-assistant',
            number: 33,
            assignees: [
              {
                login: 'mattleibow',
                type: 'User'
              }
            ],
            body: '## Description\n\nThis is another issue for the unit tests and not a real one.\n\nWe need some real data to allow for real tests.\n\nThis one has some more context though. We are wanting to relate this issue with the AI and prompt system.',
            closedAt: null,
            createdAt: new Date('2025-07-26T11:14:12.000Z'),
            updatedAt: new Date('2025-07-26T11:14:39.000Z'),
            state: 'open',
            title: 'An second issue for the unit tests',
            user: {
              login: 'mattleibow',
              type: 'User'
            }
          },
          {
            id: '3265422585',
            owner: 'mattleibow',
            repo: 'triage-assistant',
            number: 32,
            assignees: [
              {
                login: 'mattleibow',
                type: 'User'
              },
              {
                login: 'Copilot',
                type: 'Bot'
              }
            ],
            body: '## Description\n\nThis is an issue for the unit tests and not a real one.\n\nWe need some real data to allow for real tests.',
            closedAt: null,
            createdAt: new Date('2025-07-26T10:36:49.000Z'),
            updatedAt: new Date('2025-07-26T10:38:08.000Z'),
            state: 'open',
            title: 'An issue for the unit tests',
            user: {
              login: 'mattleibow',
              type: 'User'
            }
          },
          {
            id: '3263967334',
            owner: 'mattleibow',
            repo: 'triage-assistant',
            number: 31,
            assignees: [],
            body: 'Test',
            closedAt: new Date('2025-07-26T10:33:19.000Z'),
            createdAt: new Date('2025-07-25T17:53:45.000Z'),
            updatedAt: new Date('2025-07-26T10:33:19.000Z'),
            state: 'closed',
            title: 'Test Issue',
            user: {
              login: 'mattleibow',
              type: 'User'
            }
          }
        ])
      })
    })
  }
})
