import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import { EngagementConfig, TriageConfig } from '../../src/config.js'
import { getSdk, mockGetSdk } from '../../__fixtures__/generated/graphql.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

import * as realProjectFields from '../query-data/project-fields.js'
import * as realProjects from '../query-data/project-items.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested
const { getProjectDetails, getProjectField, updateProjectItem } = await import('../../src/github/projects.js')

describe('GitHub Projects', () => {
  const testTempDir = '/tmp/test'

  const mockConfig: EngagementConfig & TriageConfig = {
    dryRun: false,
    token: 'test-token',
    tempDir: testTempDir,
    issueNumber: 123,
    repoName: 'repo',
    repoOwner: 'owner',
    projectColumn: 'Engagement Score',
    applyScores: true
  }

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

  describe('getProjectField', () => {
    it('getProjectField returns field info if found', async () => {
      mockGetSdk.GetProjectFields.mockResolvedValue(realProjectFields.project8Fields())

      const result = await getProjectField(getSdk, 'mattleibow', 'triage-assistant', 8, 'Engagement Score')

      expect(mockGetSdk.GetProjectFields).toHaveBeenCalledWith({
        owner: 'mattleibow',
        repo: 'triage-assistant',
        projectNumber: 8
      })
      expect(result).toEqual({ id: 'PVTF_lAHOABC7qM4A-32IzgyVxkI', name: 'Engagement Score' })
    })

    it('getProjectField returns null if not found', async () => {
      mockGetSdk.GetProjectFields.mockResolvedValue({
        repository: { projectV2: { id: '', fields: { nodes: [] } } }
      })

      const result = await getProjectField(getSdk, 'mattleibow', 'triage-assistant', 8, 'Missing')

      expect(mockGetSdk.GetProjectFields).toHaveBeenCalledWith({
        owner: 'mattleibow',
        repo: 'triage-assistant',
        projectNumber: 8
      })
      expect(result).toBeNull()
    })
  })

  describe('getProjectDetails', () => {
    it('getProjectDetails returns all items', async () => {
      mockGetSdk.GetProjectItems.mockResolvedValue(realProjects.project8())

      const result = await getProjectDetails(getSdk, 'mattleibow', 'triage-assistant', 8)

      expect(mockGetSdk.GetProjectItems).toHaveBeenCalledWith({
        owner: 'mattleibow',
        repo: 'triage-assistant',
        projectNumber: 8,
        cursor: null
      })

      expect(result.items.length).toBe(2)

      expect(result.items[0].id).toBe('PVTI_lAHOABC7qM4A-32Izgc_eaQ')
      expect(result.items[0].content.id).toBe('I_kwDOOy552s7ComT5')

      expect(result.items[1].id).toBe('PVTI_lAHOABC7qM4A-32Izgc_fjo')
      expect(result.items[1].content.id).toBe('I_kwDOOy552s7Cos4Q')
    })
  })

  describe('updateProjectItem', () => {
    it('updateProjectItem calls UpdateProjectItemField', async () => {
      await updateProjectItem(getSdk, mockConfig, 'item1', 'field1', 'proj1', 42)

      expect(getSdk.UpdateProjectItemField).toHaveBeenCalledWith({
        projectItemId: 'item1',
        projectFieldId: 'field1',
        projectId: 'proj1',
        engagementScoreNumber: 42
      })
    })

    it('updateProjectItem skips if dryRun', async () => {
      const config = {
        ...mockConfig,
        dryRun: true
      }

      await updateProjectItem(getSdk, config, 'item1', 'field1', 'proj1', 42)

      expect(getSdk.UpdateProjectItemField).not.toHaveBeenCalled()
    })
  })
})
