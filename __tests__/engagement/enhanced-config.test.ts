import { jest } from '@jest/globals'
import { loadConfigFile, parseConfigFile } from '../../src/config-file.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

describe('Enhanced Configuration File Support', () => {
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

  describe('parseConfigFile', () => {
    it('should parse legacy flat weight configuration', () => {
      const legacyConfig = `
engagement:
  weights:
    comments: 3
    reactions: 1
    contributors: 2
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
labels:
  groups: {}
`

      const result = parseConfigFile(legacyConfig)

      expect(result).toBeDefined()
      expect(result!.engagement.weights.comments).toEqual({ base: 3 })
      expect(result!.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result!.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result!.engagement.weights.lastActivity).toBe(1)
      expect(result!.engagement.weights.issueAge).toBe(1)
      expect(result!.engagement.weights.linkedPullRequests).toBe(2)
      expect(result!.engagement.groups).toEqual({})
    })

    it('should parse role-based weight configuration', () => {
      const roleBasedConfig = `
engagement:
  weights:
    comments:
      base: 3
      maintainer: 4
      partner: 3
      firstTime: 5
      frequent: 2
    reactions:
      base: 1
      maintainer: 3
      partner: 2
      firstTime: 2
      frequent: 1
    contributors:
      base: 2
      maintainer: 2
      partner: 3
      firstTime: 4
      frequent: 2
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
  groups:
    partner:
      - "trusted-dev-1"
      - "external-collab-42"
      - "strategic-user-x"
    internal:
      - "repo-owner"
      - "core-maintainer"
labels:
  groups: {}
`

      const result = parseConfigFile(roleBasedConfig)

      expect(result).toBeDefined()
      expect(result!.engagement.weights.comments).toEqual({
        base: 3,
        maintainer: 4,
        partner: 3,
        firstTime: 5,
        frequent: 2
      })
      expect(result!.engagement.weights.reactions).toEqual({
        base: 1,
        maintainer: 3,
        partner: 2,
        firstTime: 2,
        frequent: 1
      })
      expect(result!.engagement.weights.contributors).toEqual({
        base: 2,
        maintainer: 2,
        partner: 3,
        firstTime: 4,
        frequent: 2
      })
      expect(result!.engagement.groups).toEqual({
        partner: ['trusted-dev-1', 'external-collab-42', 'strategic-user-x'],
        internal: ['repo-owner', 'core-maintainer']
      })
    })

    it('should parse mixed weight configuration (some flat, some role-based)', () => {
      const mixedConfig = `
engagement:
  weights:
    comments:
      base: 3
      firstTime: 5
    reactions: 1
    contributors:
      base: 2
      maintainer: 3
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
  groups:
    partner:
      - "trusted-user"
labels:
  groups: {}
`

      const result = parseConfigFile(mixedConfig)

      expect(result).toBeDefined()
      expect(result!.engagement.weights.comments).toEqual({
        base: 3,
        firstTime: 5
      })
      expect(result!.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result!.engagement.weights.contributors).toEqual({
        base: 2,
        maintainer: 3
      })
      expect(result!.engagement.groups).toEqual({
        partner: ['trusted-user']
      })
    })

    it('should use default values for missing weights', () => {
      const minimalConfig = `
engagement:
  weights:
    comments: 5
labels:
  groups: {}
`

      const result = parseConfigFile(minimalConfig)

      expect(result).toBeDefined()
      expect(result!.engagement.weights.comments).toEqual({ base: 5 })
      expect(result!.engagement.weights.reactions).toEqual({ base: 1 }) // default
      expect(result!.engagement.weights.contributors).toEqual({ base: 2 }) // default
      expect(result!.engagement.weights.lastActivity).toBe(1) // default
      expect(result!.engagement.weights.issueAge).toBe(1) // default
      expect(result!.engagement.weights.linkedPullRequests).toBe(2) // default
    })

    it('should handle empty configuration', () => {
      const emptyConfig = `{}`

      const result = parseConfigFile(emptyConfig)

      expect(result).toBeDefined()
      expect(result!.engagement.weights.comments).toEqual({ base: 3 }) // default
      expect(result!.engagement.weights.reactions).toEqual({ base: 1 }) // default
      expect(result!.engagement.weights.contributors).toEqual({ base: 2 }) // default
      expect(result!.engagement.groups).toEqual({})
    })

    it('should handle partial role-based weights', () => {
      const partialConfig = `
engagement:
  weights:
    comments:
      base: 3
      maintainer: 4
    reactions:
      base: 1
    contributors: 2
labels:
  groups: {}
`

      const result = parseConfigFile(partialConfig)

      expect(result).toBeDefined()
      expect(result!.engagement.weights.comments).toEqual({
        base: 3,
        maintainer: 4
      })
      expect(result!.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result!.engagement.weights.contributors).toEqual({ base: 2 })
    })

    it('should return undefined for invalid YAML', () => {
      const invalidConfig = `
engagement:
  weights:
    comments: invalid_yaml_syntax: [
labels:
  - invalid
`

      expect(() => parseConfigFile(invalidConfig)).toThrow()
    })
  })

  describe('loadConfigFile', () => {
    const workspacePath = 'test-workspace'

    it('should load role-based configuration from .triagerc.yml', async () => {
      const roleBasedConfig = `
engagement:
  weights:
    comments:
      base: 3
      maintainer: 4
      partner: 3
      firstTime: 5
      frequent: 2
    reactions:
      base: 1
      maintainer: 3
    contributors:
      base: 2
      firstTime: 4
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
  groups:
    partner:
      - "partner-user-1"
      - "partner-user-2"
labels:
  groups: {}
`

      inMemoryFs.forceSet(`/home/runner/work/triage-assistant/triage-assistant/${workspacePath}/.triagerc.yml`, roleBasedConfig)

      const result = await loadConfigFile(workspacePath)

      expect(result.engagement.weights.comments).toEqual({
        base: 3,
        maintainer: 4,
        partner: 3,
        firstTime: 5,
        frequent: 2
      })
      expect(result.engagement.groups).toEqual({
        partner: ['partner-user-1', 'partner-user-2']
      })
    })

    it('should fall back to .github/.triagerc.yml when root config does not exist', async () => {
      const roleBasedConfig = `
engagement:
  weights:
    comments:
      base: 3
      maintainer: 4
    reactions: 1
    contributors: 2
    lastActivity: 2
    issueAge: 1
    linkedPullRequests: 2
  groups:
    partner:
      - "github-partner"
labels:
  groups: {}
`

      inMemoryFs.forceSet(`/home/runner/work/triage-assistant/triage-assistant/${workspacePath}/.github/.triagerc.yml`, roleBasedConfig)

      const result = await loadConfigFile(workspacePath)

      expect(result.engagement.weights.comments).toEqual({
        base: 3,
        maintainer: 4
      })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.lastActivity).toBe(2)
      expect(result.engagement.groups).toEqual({
        partner: ['github-partner']
      })
    })

    it('should use defaults when no config files exist', async () => {
      const result = await loadConfigFile(workspacePath)

      expect(result.engagement.weights.comments).toEqual({ base: 3 })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({ base: 2 })
      expect(result.engagement.weights.lastActivity).toBe(1)
      expect(result.engagement.weights.issueAge).toBe(1)
      expect(result.engagement.weights.linkedPullRequests).toBe(2)
      expect(result.engagement.groups).toEqual({})
    })

    it('should preserve legacy configuration compatibility', async () => {
      const legacyConfig = `
engagement:
  weights:
    comments: 4
    reactions: 2
    contributors: 3
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 1
labels:
  groups:
    area:
      labelPrefix: 'area-'
      template: 'single-label'
`

      inMemoryFs.forceSet(`/home/runner/work/triage-assistant/triage-assistant/${workspacePath}/.triagerc.yml`, legacyConfig)

      const result = await loadConfigFile(workspacePath)

      // Legacy flat weights should be converted to role-based format
      expect(result.engagement.weights.comments).toEqual({ base: 4 })
      expect(result.engagement.weights.reactions).toEqual({ base: 2 })
      expect(result.engagement.weights.contributors).toEqual({ base: 3 })
      expect(result.engagement.weights.linkedPullRequests).toBe(1)

      // Labels configuration should be preserved
      expect(result.labels.groups.area).toEqual({
        labelPrefix: 'area-',
        template: 'single-label'
      })
    })

    it('should handle selective overrides in role-based configuration', async () => {
      const selectiveConfig = `
engagement:
  weights:
    comments:
      base: 3
      firstTime: 5
    reactions: 1
    contributors:
      base: 2
      partner: 4
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2
  groups:
    partner:
      - "strategic-partner"
labels:
  groups: {}
`

      inMemoryFs.forceSet(`/home/runner/work/triage-assistant/triage-assistant/${workspacePath}/.triagerc.yml`, selectiveConfig)

      const result = await loadConfigFile(workspacePath)

      expect(result.engagement.weights.comments).toEqual({
        base: 3,
        firstTime: 5
      })
      expect(result.engagement.weights.reactions).toEqual({ base: 1 })
      expect(result.engagement.weights.contributors).toEqual({
        base: 2,
        partner: 4
      })
      expect(result.engagement.groups).toEqual({
        partner: ['strategic-partner']
      })
    })
  })
})