import { loadConfigFile } from '../../src/config-file.js'
import { FileSystemMock } from '../helpers/filesystem-mock.js'

describe('Path Traversal Security Tests', () => {
  const inMemoryFs = new FileSystemMock()

  beforeEach(() => {
    inMemoryFs.setup()
  })

  afterEach(() => {
    inMemoryFs.teardown()
  })

  describe('loadConfigFile Path Safety', () => {
    it('should reject paths outside workspace using ../', async () => {
      const maliciousPath = '../../../etc/passwd'

      await expect(loadConfigFile(maliciousPath)).rejects.toThrow(
        'Invalid workspace path: ../../../etc/passwd resolves outside current directory'
      )
    })

    it('should reject absolute paths in workspace parameter', async () => {
      const absolutePath = '/etc/passwd'

      await expect(loadConfigFile(absolutePath)).rejects.toThrow(
        'Invalid workspace path: /etc/passwd resolves outside current directory'
      )
    })

    it('should accept valid relative paths', async () => {
      const validPath = './valid-workspace'

      // Create a valid config file
      inMemoryFs.forceSet(`${process.cwd()}/valid-workspace/.triagerc.yml`, 'engagement:\n  weights:\n    comments: 5')

      const result = await loadConfigFile(validPath)
      expect(result.engagement.weights.comments).toEqual({ base: 5 })
    })

    it('should normalize and validate paths correctly', async () => {
      const pathWithDots = './workspace/../workspace'

      // Create a valid config file
      inMemoryFs.forceSet(`${process.cwd()}/workspace/.triagerc.yml`, 'engagement:\n  weights:\n    reactions: 3')

      const result = await loadConfigFile(pathWithDots)
      expect(result.engagement.weights.reactions).toEqual({ base: 3 })
    })

    it('should work with default workspace path', async () => {
      // Create config in current directory
      inMemoryFs.forceSet(`${process.cwd()}/.triagerc.yml`, 'engagement:\n  weights:\n    contributors: 4')

      const result = await loadConfigFile()
      expect(result.engagement.weights.contributors).toEqual({ base: 4 })
    })

    it('should check .github subdirectory safely', async () => {
      // Create config in .github directory
      inMemoryFs.forceSet(`${process.cwd()}/.github/.triagerc.yml`, 'engagement:\n  weights:\n    lastActivity: 2')

      const result = await loadConfigFile()
      expect(result.engagement.weights.lastActivity).toBe(2)
    })

    it('should handle symbolic link-like paths safely', async () => {
      const symlinkPath = './workspace/../../../sensitive'

      await expect(loadConfigFile(symlinkPath)).rejects.toThrow(
        'Invalid workspace path: ./workspace/../../../sensitive resolves outside current directory'
      )
    })

    it('should handle multiple directory traversal attempts', async () => {
      const traversalPath = './../../../../../../etc'

      await expect(loadConfigFile(traversalPath)).rejects.toThrow(
        'Invalid workspace path: ./../../../../../../etc resolves outside current directory'
      )
    })
  })
})
