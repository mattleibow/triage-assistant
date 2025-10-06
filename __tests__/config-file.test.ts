import { jest } from '@jest/globals'
import path from 'path'
import * as core from '../__fixtures__/actions/core.js'
import { FileSystemMock } from './helpers/filesystem-mock.js'
import { ConfigFileEngagementWeights } from '../src/config-file.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

// Import the module being tested
const { loadConfigFile, DEFAULT_ENGAGEMENT_WEIGHTS } = await import('../src/config-file.js')

describe('EngagementConfig', () => {
  const inMemoryFs = new FileSystemMock()
  const testWorkspacePath = path.join(process.cwd(), 'test/workspace')

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

  describe('loadConfigFile', () => {
    it('should return default weights when no config file exists', async () => {
      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 3 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load configuration from the following paths:')
      )
    })

    it('should load config from .triagerc.yml', async () => {
      const configContent = `
engagement:
  weights:
    comments: 5
    reactions: 2
    contributors: 3
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 5 })
      expect(result.engagement.weights.reactions).toEqual({ base: 2 })
      expect(result.engagement.weights.contributors).toEqual({ base: 3 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
    })

    it('should load config from .github/.triagerc.yml when root config not found', async () => {
      const configContent = `
engagement:
  weights:
    comments: 4
    linkedPullRequests: 3
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.github/.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 4 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(3)
    })

    it('should merge partial weights with defaults', async () => {
      const configContent = `
engagement:
  weights:
    comments: 8
    lastActivity: 3
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 8 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(3)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
    })

    it('should handle invalid YAML gracefully', async () => {
      const invalidYaml = 'invalid: yaml: content: ['
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), invalidYaml)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 3 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
    })

    it('should handle missing engagement section', async () => {
      const configContent = `
other:
  config: value
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 3 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
    })

    it('should handle missing weights section', async () => {
      const configContent = `
engagement:
  other: value
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 3 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
    })

    it('should prefer root config over .github config', async () => {
      const rootConfig = `
engagement:
  weights:
    comments: 10
`
      const githubConfig = `
engagement:
  weights:
    comments: 5
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), rootConfig)
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.github/.triagerc.yml'), githubConfig)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 10 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
    })

    it('should handle complete custom weights configuration', async () => {
      const configContent = `
engagement:
  weights:
    comments: 5
    reactions: 3
    contributors: 4
    lastActivity: 2
    issueAge: 1
    linkedPullRequests: 6
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      // With the new role-based system, flat weights get converted to { base: value }
      expect(result.engagement.weights.comments).toEqual({ base: 5 })
      expect(result.engagement.weights.reactions).toEqual({ base: 3 })
      expect(result.engagement.weights.contributors).toEqual({ base: 4 })
      expect(result.engagement.weights.lastActivity).toBe(2)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(6)
    })
  })
})
