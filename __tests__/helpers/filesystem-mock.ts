import * as fs from 'fs'
import * as path from 'path'
import { jest } from '@jest/globals'

export class FileSystemMock {
  private files = new Map<string, string>()
  private directories = new Set<string>()

  setup(): void {
    this.files.clear()
    this.directories.clear()

    // Mock file system operations
    jest.spyOn(fs.promises, 'mkdir').mockImplementation(async (dirPath, options) => {
      this.mkdir(dirPath.toString(), options as { recursive: boolean })
      return Promise.resolve(undefined)
    })

    // Mock fs.writeFile to write to in-memory filesystem
    jest.spyOn(fs.promises, 'writeFile').mockImplementation(async (filePath, content) => {
      this.writeFile(filePath.toString(), content.toString())
    })

    // Mock fs.readFile to read from in-memory filesystem
    jest.spyOn(fs.promises, 'readFile').mockImplementation(async (filePath) => {
      const file = path.join(filePath.toString())
      console.error(`Reading file: ${file}`)

      const content = this.files.get(file)
      if (content) {
        return content
      } else {
        throw new Error(`File not found: ${filePath}`)
      }
    })

    // Mock readdir to list files in a directory
    jest.spyOn(fs.promises, 'readdir').mockImplementation((async (dirPath) => {
      const dir = path.join(dirPath.toString())
      console.error(`Reading directory: ${dir}`)

      if (!this.directories.has(dir)) {
        throw new Error(`Directory not found: ${dir}`)
      }

      const files = Array.from(this.files.keys())
        .filter((file) => path.dirname(path.join(file)).startsWith(dir))
        .map((file) => path.basename(file))

      console.log(`Reading directory: ${dir}, files: ${files.join(', ')}`)

      return Promise.resolve(files)
    }) as typeof fs.promises.readdir)
  }

  teardown(): void {
    this.files.clear()
    this.directories.clear()
  }

  get(filePath: string): string | undefined {
    return this.files.get(filePath)
  }

  forceSet(filePath: string, content: string): void {
    console.error(`Forcing set file: ${filePath}`)
    this.mkdir(path.dirname(filePath), { recursive: true })
    this.writeFile(filePath, content)
  }

  has(filePath: string): boolean {
    return this.files.has(filePath)
  }

  private writeFile(filePath: string, content: string) {
    const file = path.join(filePath)
    console.log(`Writing file: ${file}`)

    const dir = path.dirname(file)
    if (!this.directories.has(dir)) {
      throw new Error(`Directory not found: ${dir}`)
    }
    this.files.set(file, content)
  }

  private mkdir(dirPath: string, options?: { recursive: boolean } | null | undefined) {
    const dir = path.join(dirPath.toString())
    if (!this.directories.has(dir)) {
      console.log(`Creating directory: ${dir}`)
      this.directories.add(dir)

      if (options?.recursive) {
        let parentDir = path.dirname(dir)
        while (!this.directories.has(parentDir)) {
          console.log(`Creating parent directory: ${parentDir}`)
          this.directories.add(parentDir)

          parentDir = path.dirname(parentDir)
        }
      }
    }
  }
}
