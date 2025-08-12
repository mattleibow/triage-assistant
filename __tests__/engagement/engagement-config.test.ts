import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'
import {
  loadTriageConfig,
  DEFAULT_ENGAGEMENT_WEIGHTS,
  EngagementWeights
} from '../../src/engagement/engagement-config.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

describe('EngagementConfig', () => {
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

  describe('loadTriageConfig', () => {
    it('should return default weights when no config file exists', async () => {
      // Use a relative path within the current directory
      const workspacePath = 'test-workspace'
      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should load config from .triagerc.yml', async () => {
      const workspacePath = 'test-workspace'
      const configContent = `
engagement:
  weights:
    comments: 5
    reactions: 2
    contributors: 3
`
      // Use the resolved absolute path that safePath will generate
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        configContent
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 5,
        reactions: 2,
        contributors: 3
      })
    })

    it('should load config from .github/.triagerc.yml when root config not found', async () => {
      const workspacePath = 'test-workspace'
      const configContent = `
engagement:
  weights:
    comments: 4
    linkedPullRequests: 3
`
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.github/.triagerc.yml',
        configContent
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 4,
        linkedPullRequests: 3
      })
    })

    it('should merge partial weights with defaults', async () => {
      const workspacePath = 'test-workspace'
      const configContent = `
engagement:
  weights:
    comments: 8
    lastActivity: 3
`
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        configContent
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual({
        comments: 8,
        reactions: DEFAULT_ENGAGEMENT_WEIGHTS.reactions,
        contributors: DEFAULT_ENGAGEMENT_WEIGHTS.contributors,
        lastActivity: 3,
        issueAge: DEFAULT_ENGAGEMENT_WEIGHTS.issueAge,
        linkedPullRequests: DEFAULT_ENGAGEMENT_WEIGHTS.linkedPullRequests
      })
    })

    it('should handle invalid YAML gracefully', async () => {
      const workspacePath = 'test-workspace'
      const invalidYaml = 'invalid: yaml: content: ['
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        invalidYaml
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should handle missing engagement section', async () => {
      const workspacePath = 'test-workspace'
      const configContent = `
other:
  config: value
`
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        configContent
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should handle missing weights section', async () => {
      const workspacePath = 'test-workspace'
      const configContent = `
engagement:
  other: value
`
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        configContent
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual(DEFAULT_ENGAGEMENT_WEIGHTS)
    })

    it('should prefer root config over .github config', async () => {
      const workspacePath = 'test-workspace'
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
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        rootConfig
      )
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.github/.triagerc.yml',
        githubConfig
      )

      const result = await loadTriageConfig(workspacePath)

      expect(result).toEqual({
        ...DEFAULT_ENGAGEMENT_WEIGHTS,
        comments: 10
      })
    })

    it('should handle complete custom weights configuration', async () => {
      const workspacePath = 'test-workspace'
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
      inMemoryFs.forceSet(
        '/home/runner/work/triage-assistant/triage-assistant/test-workspace/.triagerc.yml',
        configContent
      )

      const result = await loadTriageConfig(workspacePath)

      const expected: EngagementWeights = {
        comments: 5,
        reactions: 3,
        contributors: 4,
        lastActivity: 2,
        issueAge: 1,
        linkedPullRequests: 6
      }

      expect(result).toEqual(expected)
    })
  })

  describe('DEFAULT_ENGAGEMENT_WEIGHTS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ENGAGEMENT_WEIGHTS).toEqual({
        comments: 3,
        reactions: 1,
        contributors: 2,
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      })
    })

    it('should have all required weight properties', () => {
      const weights = DEFAULT_ENGAGEMENT_WEIGHTS
      expect(typeof weights.comments).toBe('number')
      expect(typeof weights.reactions).toBe('number')
      expect(typeof weights.contributors).toBe('number')
      expect(typeof weights.lastActivity).toBe('number')
      expect(typeof weights.issueAge).toBe('number')
      expect(typeof weights.linkedPullRequests).toBe('number')
    })
  })
})
