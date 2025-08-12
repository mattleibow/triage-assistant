import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)

const { loadTriageConfig } = await import('../../src/engagement/engagement-config.js')

describe('YAML Security Tests', () => {
  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    jest.clearAllMocks()
    inMemoryFs.setup()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('Safe YAML Parsing', () => {
    it('should safely parse valid YAML configuration', async () => {
      const validConfig = `
engagement:
  weights:
    comments: 5
    reactions: 2
    contributors: 3
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 4
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', validConfig)
      
      const weights = await loadTriageConfig(process.cwd() + '/workspace')
      
      expect(weights).toEqual({
        comments: 5,
        reactions: 2,
        contributors: 3,
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 4
      })
    })

    it('should handle malicious YAML constructs safely', async () => {
      const maliciousConfig = `
# YAML bomb attempt
engagement: &anchor
  weights:
    comments: 3
    reactions: *anchor
    contributors: 2
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', maliciousConfig)
      
      // Should not crash or hang due to YAML bomb
      const startTime = Date.now()
      const weights = await loadTriageConfig(process.cwd() + '/workspace')
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should complete quickly
      expect(weights.comments).toBe(3)
    })

    it('should handle invalid YAML gracefully', async () => {
      const invalidConfig = `
engagement:
  weights:
    comments: 3
    reactions: not-a-number
    contributors: [invalid, structure
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', invalidConfig)
      
      // Should fall back to defaults for invalid config
      const weights = await loadTriageConfig(process.cwd() + '/workspace')
      
      expect(weights).toEqual({
        comments: 3,
        reactions: 1,
        contributors: 2,
        lastActivity: 1,
        issueAge: 1,
        linkedPullRequests: 2
      })
    })

    it('should prevent prototype pollution attempts', async () => {
      const maliciousConfig = `
__proto__:
  polluted: true
constructor:
  prototype:
    polluted: true
engagement:
  weights:
    comments: 3
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', maliciousConfig)
      
      const weights = await loadTriageConfig(process.cwd() + '/workspace')
      
      // Should not pollute Object prototype
      expect((Object.prototype as any).polluted).toBeUndefined()
      expect(weights.comments).toBe(3)
    })

    it('should handle deeply nested structures safely', async () => {
      const deeplyNestedConfig = `
engagement:
  weights:
    comments: 3
  deep:
    very:
      deeply:
        nested:
          structure:
            value: "test"
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', deeplyNestedConfig)
      
      const startTime = Date.now()
      const weights = await loadTriageConfig(process.cwd() + '/workspace')
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should complete quickly
      expect(weights.comments).toBe(3)
    })
  })

  describe('Configuration Security', () => {
    it('should warn about YAML parsing issues', async () => {
      const warningConfig = `
# This will trigger a warning
engagement:
  weights: !!js/undefined ""
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', warningConfig)
      
      await loadTriageConfig(process.cwd() + '/workspace')
      
      // Should have called core.warning for YAML warning
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('YAML parsing warning')
      )
    })

    it('should use safe YAML schema', async () => {
      const jsExecConfig = `
engagement:
  weights:
    comments: !!js/function "function() { return 3; }"
    reactions: 1
`
      
      inMemoryFs.forceSet(process.cwd() + '/workspace/.triagerc.yml', jsExecConfig)
      
      // Should not execute JavaScript code
      const weights = await loadTriageConfig(process.cwd() + '/workspace')
      
      // Should fall back to defaults since JS execution should be blocked
      expect(typeof weights.comments).toBe('number')
      expect(weights.comments).toBe(3) // Default value
    })
  })
})