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

      expect(result.engagement.weights).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
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

      expect(result.engagement.weights).not.toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
      expect(result.engagement.weights).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 5,
        reactions: 2,
        contributors: 3
      })
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

      expect(result.engagement.weights).not.toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
      expect(result.engagement.weights).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 4,
        linkedPullRequests: 3
      })
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

      expect(result.engagement.weights).not.toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
      expect(result.engagement.weights).toEqual({
        comments: 8,
        reactions: DEFAULT_ENGAGEMENT_WEIGHTS.reactions,
        contributors: DEFAULT_ENGAGEMENT_WEIGHTS.contributors,
        lastActivity: 3,
        issueAge: DEFAULT_ENGAGEMENT_WEIGHTS.issueAge,
        linkedPullRequests: DEFAULT_ENGAGEMENT_WEIGHTS.linkedPullRequests
      })
    })

    it('should handle invalid YAML gracefully', async () => {
      const invalidYaml = 'invalid: yaml: content: ['
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), invalidYaml)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should handle missing engagement section', async () => {
      const configContent = `
other:
  config: value
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should handle missing weights section', async () => {
      const configContent = `
engagement:
  other: value
`
      inMemoryFs.forceSet(path.join(testWorkspacePath, '.triagerc.yml'), configContent)

      const result = await loadConfigFile(testWorkspacePath)

      expect(result.engagement.weights).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
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

      expect(result.engagement.weights).not.toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
      expect(result.engagement.weights).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 10
      })
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

      const expected: ConfigFileEngagementWeights = {
        comments: 5,
        reactions: 3,
        contributors: 4,
        lastActivity: 2,
        issueAge: 1,
        linkedPullRequests: 6
      }

      expect(result.engagement.weights).toEqual(expected)
    })
  })
})
