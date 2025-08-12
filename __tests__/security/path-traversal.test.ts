import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { loadTriageConfig } from '../../src/engagement/engagement-config.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

describe('Path Traversal Security Tests', () => {
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

  describe('loadTriageConfig Path Safety', () => {
    it('should reject paths outside workspace using ../', async () => {
      const maliciousPath = '../../../etc/passwd'

      await expect(loadTriageConfig(maliciousPath)).rejects.toThrow(
        'Invalid workspace path: ../../../etc/passwd resolves outside current directory'
      )
    })

    it('should reject absolute paths in workspace parameter', async () => {
      const absolutePath = '/etc/passwd'

      await expect(loadTriageConfig(absolutePath)).rejects.toThrow(
        'Invalid workspace path: /etc/passwd resolves outside current directory'
      )
    })

    it('should accept valid relative paths', async () => {
      const validPath = './valid-workspace'

      // Create a valid config file
      inMemoryFs.forceSet(`${process.cwd()}/valid-workspace/.triagerc.yml`, 'engagement:\n  weights:\n    comments: 5')

      const result = await loadTriageConfig(validPath)
      expect(result.comments).toBe(5)
    })

    it('should normalize and validate paths correctly', async () => {
      const pathWithDots = './workspace/../workspace'

      // Create a valid config file
      inMemoryFs.forceSet(`${process.cwd()}/workspace/.triagerc.yml`, 'engagement:\n  weights:\n    reactions: 3')

      const result = await loadTriageConfig(pathWithDots)
      expect(result.reactions).toBe(3)
    })

    it('should work with default workspace path', async () => {
      // Create config in current directory
      inMemoryFs.forceSet(`${process.cwd()}/.triagerc.yml`, 'engagement:\n  weights:\n    contributors: 4')

      const result = await loadTriageConfig()
      expect(result.contributors).toBe(4)
    })

    it('should check .github subdirectory safely', async () => {
      // Create config in .github directory
      inMemoryFs.forceSet(`${process.cwd()}/.github/.triagerc.yml`, 'engagement:\n  weights:\n    lastActivity: 2')

      const result = await loadTriageConfig()
      expect(result.lastActivity).toBe(2)
    })

    it('should handle symbolic link-like paths safely', async () => {
      const symlinkPath = './workspace/../../../sensitive'

      await expect(loadTriageConfig(symlinkPath)).rejects.toThrow(
        'Invalid workspace path: ./workspace/../../../sensitive resolves outside current directory'
      )
    })

    it('should handle multiple directory traversal attempts', async () => {
      const traversalPath = './../../../../../../etc'

      await expect(loadTriageConfig(traversalPath)).rejects.toThrow(
        'Invalid workspace path: ./../../../../../../etc resolves outside current directory'
      )
    })
  })
})
