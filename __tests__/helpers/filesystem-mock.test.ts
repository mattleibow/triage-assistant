/**
 * Unit tests for the FileSystemMock helper
 */

import * as fs from 'fs'
import * as path from 'path'
import { jest } from '@jest/globals'
import { FileSystemMock } from './filesystem-mock.js'

describe('FileSystemMock', () => {
  let fsmock: FileSystemMock
  beforeEach(() => {
    fsmock = new FileSystemMock()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('setup and teardown', () => {
    it('should clear files and directories on setup', () => {
      // Pre-populate with some data
      fsmock.forceSet('/test/file.txt', 'content')
      expect(fsmock.has('/test/file.txt')).toBe(true)

      fsmock.setup()
      expect(fsmock.has('/test/file.txt')).toBe(false)
    })

    it('should clear files and directories on teardown', () => {
      fsmock.setup()
      fsmock.forceSet('/test/file.txt', 'content')
      expect(fsmock.has('/test/file.txt')).toBe(true)

      fsmock.teardown()
      expect(fsmock.has('/test/file.txt')).toBe(false)
    })

    // it('should mock fs.promises methods when setup is called', () => {
    //   const mkdirSpy = jest.spyOn(fs.promises, 'mkdir')
    //   const writeFileSpy = jest.spyOn(fs.promises, 'writeFile')
    //   const readFileSpy = jest.spyOn(fs.promises, 'readFile')
    //   const readdirSpy = jest.spyOn(fs.promises, 'readdir')

    //   fsmock.setup()

    //   expect(mkdirSpy).toHaveBeenCalled()
    //   expect(writeFileSpy).toHaveBeenCalled()
    //   expect(readFileSpy).toHaveBeenCalled()
    //   expect(readdirSpy).toHaveBeenCalled()
    // })
  })

  describe('file operations', () => {
    beforeEach(() => {
      fsmock.setup()
    })

    afterEach(() => {
      fsmock.teardown()
    })

    it('should write and read files correctly', async () => {
      // Create directory first
      await fs.promises.mkdir('/test', { recursive: true })

      // Write file
      await fs.promises.writeFile('/test/file.txt', 'test content')

      // Read file
      const content = await fs.promises.readFile('/test/file.txt')
      expect(content).toBe('test content')
    })

    it('should throw error when reading non-existent file', async () => {
      await expect(fs.promises.readFile('/non-existent.txt')).rejects.toThrow('File not found: /non-existent.txt')
    })

    it('should throw error when writing to non-existent directory', async () => {
      await expect(fs.promises.writeFile('/non-existent/file.txt', 'content')).rejects.toThrow('Directory not found')
    })

    it('should create directories with mkdir', async () => {
      await fs.promises.mkdir('/test/nested/deep', { recursive: true })

      // Should be able to write to the created directory
      await fs.promises.writeFile('/test/nested/deep/file.txt', 'content')
      const content = await fs.promises.readFile('/test/nested/deep/file.txt')
      expect(content).toBe('content')
    })

    it('should list files in directory with readdir', async () => {
      await fs.promises.mkdir('/test', { recursive: true })
      await fs.promises.writeFile('/test/file1.txt', 'content1')
      await fs.promises.writeFile('/test/file2.txt', 'content2')

      const files = await fs.promises.readdir('/test')
      expect(files).toContain('file1.txt')
      expect(files).toContain('file2.txt')
    })

    it('should throw error when reading non-existent directory', async () => {
      await expect(fs.promises.readdir('/non-existent')).rejects.toThrow('Directory not found: /non-existent')
    })
  })

  describe('helper methods', () => {
    beforeEach(() => {
      fsmock.setup()
    })

    afterEach(() => {
      fsmock.teardown()
    })

    it('should get file content with get method', () => {
      fsmock.forceSet('/test/file.txt', 'test content')
      expect(fsmock.get('/test/file.txt')).toBe('test content')
    })

    it('should return undefined for non-existent file with get method', () => {
      expect(fsmock.get('/non-existent.txt')).toBeUndefined()
    })

    it('should check file existence with has method', () => {
      fsmock.forceSet('/test/file.txt', 'content')
      expect(fsmock.has('/test/file.txt')).toBe(true)
      expect(fsmock.has('/non-existent.txt')).toBe(false)
    })

    it('should force set files and create directories with forceSet', () => {
      fsmock.forceSet('/deep/nested/path/file.txt', 'content')

      expect(fsmock.has('/deep/nested/path/file.txt')).toBe(true)
      expect(fsmock.get('/deep/nested/path/file.txt')).toBe('content')
    })

    it('should handle multiple files in the same directory', () => {
      fsmock.forceSet('/test/file1.txt', 'content1')
      fsmock.forceSet('/test/file2.txt', 'content2')
      fsmock.forceSet('/test/subfolder/file3.txt', 'content3')

      expect(fsmock.get('/test/file1.txt')).toBe('content1')
      expect(fsmock.get('/test/file2.txt')).toBe('content2')
      expect(fsmock.get('/test/subfolder/file3.txt')).toBe('content3')
    })

    it('should handle windows-style paths', () => {
      fsmock.forceSet('C:\\test\\file.txt', 'content')
      expect(fsmock.has('C:\\test\\file.txt')).toBe(true)
      expect(fsmock.get('C:\\test\\file.txt')).toBe('content')
    })

    it('should normalize paths correctly', () => {
      fsmock.forceSet('/test/../test/file.txt', 'content')
      const normalizedPath = path.join('/test/../test/file.txt')
      expect(fsmock.has(normalizedPath)).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    beforeEach(() => {
      fsmock.setup()
    })

    afterEach(() => {
      fsmock.teardown()
    })

    it('should handle complex directory structures', async () => {
      // Create a complex directory structure
      await fs.promises.mkdir('/project/src/utils', { recursive: true })
      await fs.promises.mkdir('/project/tests', { recursive: true })

      // Write files
      await fs.promises.writeFile('/project/package.json', '{"name": "test"}')
      await fs.promises.writeFile('/project/src/index.ts', 'export * from "./utils"')
      await fs.promises.writeFile('/project/src/utils/helper.ts', 'export const help = () => {}')
      await fs.promises.writeFile('/project/tests/index.test.ts', 'describe("test", () => {})')

      // Verify files exist
      expect(await fs.promises.readFile('/project/package.json')).toBe('{"name": "test"}')
      expect(await fs.promises.readFile('/project/src/index.ts')).toBe('export * from "./utils"')
      expect(await fs.promises.readFile('/project/src/utils/helper.ts')).toBe('export const help = () => {}')
      expect(await fs.promises.readFile('/project/tests/index.test.ts')).toBe('describe("test", () => {})')

      // Verify directory listings
      const rootFiles = await fs.promises.readdir('/project')
      expect(rootFiles).toContain('package.json')

      const srcFiles = await fs.promises.readdir('/project/src')
      expect(srcFiles).toContain('index.ts')

      const utilsFiles = await fs.promises.readdir('/project/src/utils')
      expect(utilsFiles).toContain('helper.ts')
    })

    it('should handle overwriting files', async () => {
      await fs.promises.mkdir('/test', { recursive: true })

      // Write initial content
      await fs.promises.writeFile('/test/file.txt', 'original content')
      expect(await fs.promises.readFile('/test/file.txt')).toBe('original content')

      // Overwrite content
      await fs.promises.writeFile('/test/file.txt', 'updated content')
      expect(await fs.promises.readFile('/test/file.txt')).toBe('updated content')
    })

    it('should maintain separate state between setup calls', () => {
      // First setup
      fsmock.setup()
      fsmock.forceSet('/test/file1.txt', 'content1')
      expect(fsmock.has('/test/file1.txt')).toBe(true)

      // Second setup should clear state
      fsmock.setup()
      expect(fsmock.has('/test/file1.txt')).toBe(false)

      // Add new content
      fsmock.forceSet('/test/file2.txt', 'content2')
      expect(fsmock.has('/test/file2.txt')).toBe(true)
      expect(fsmock.has('/test/file1.txt')).toBe(false)
    })

    it('should handle empty directories', async () => {
      await fs.promises.mkdir('/empty', { recursive: true })

      const files = await fs.promises.readdir('/empty')
      expect(files).toEqual([])
    })

    it('should handle binary-like content', async () => {
      await fs.promises.mkdir('/test', { recursive: true })

      const binaryContent = '\x00\x01\x02\x03\xFF'
      await fs.promises.writeFile('/test/binary.dat', binaryContent)

      const readContent = await fs.promises.readFile('/test/binary.dat')
      expect(readContent).toBe(binaryContent)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      fsmock.setup()
    })

    afterEach(() => {
      fsmock.teardown()
    })

    it('should throw meaningful errors for missing files', async () => {
      const expectedPath = '/missing/file.txt'
      await expect(fs.promises.readFile(expectedPath)).rejects.toThrow(`File not found: ${expectedPath}`)
    })

    it('should throw meaningful errors for missing directories when writing', async () => {
      await expect(fs.promises.writeFile('/missing/dir/file.txt', 'content')).rejects.toThrow('Directory not found')
    })

    it('should throw meaningful errors for missing directories when reading directory', async () => {
      const expectedPath = '/missing/dir'
      await expect(fs.promises.readdir(expectedPath)).rejects.toThrow(`Directory not found: ${expectedPath}`)
    })

    it('should handle invalid path characters gracefully', () => {
      // This should not throw an error, just normalize the path
      expect(() => fsmock.forceSet('/test//double//slash//file.txt', 'content')).not.toThrow()

      const normalizedPath = path.join('/test//double//slash//file.txt')
      expect(fsmock.has(normalizedPath)).toBe(true)
    })
  })
})
