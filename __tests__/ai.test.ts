/**
 * Unit tests for the AI functionality, src/ai.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'
import * as exec from '../__fixtures__/exec.js'
import * as fs from 'fs'
import * as path from 'path'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)

// Import the module being tested
const { generatePrompt } = await import('../src/ai.js')

describe('generatePrompt', () => {
  const mockConfig = {
    token: 'test-token'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should generate prompt with simple placeholders', async () => {
    const templateContent = 'Hello {{name}}, welcome to {{project}}!'
    const replacements = { name: 'John', project: 'TestProject' }

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe('Hello John, welcome to TestProject!')
  })

  it('should handle template without placeholders', async () => {
    const templateContent = 'This is a simple template without placeholders.'
    const replacements = {}

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe('This is a simple template without placeholders.')
  })

  it('should handle multiple line template', async () => {
    const templateContent = `Line 1: {{value1}}
Line 2: {{value2}}
Line 3: Static text`
    const replacements = { value1: 'First', value2: 'Second' }

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe(`Line 1: First
Line 2: Second
Line 3: Static text`)
  })

  it('should handle empty template', async () => {
    const templateContent = ''
    const replacements = {}

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe('')
  })

  it('should handle template with unused placeholders in replacements', async () => {
    const templateContent = 'Hello {{name}}!'
    const replacements = { name: 'John', unused: 'value' }

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe('Hello John!')
  })

  it('should handle template with missing replacement values', async () => {
    const templateContent = 'Hello {{name}}, welcome to {{project}}!'
    const replacements = { name: 'John' }

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe('Hello John, welcome to {{project}}!')
  })

  it('should execute EXEC commands', async () => {
    const templateContent = `Before command
EXEC: echo "test output"
After command`
    const replacements = {}

    // Mock exec to resolve with output
    exec.exec.mockImplementation((command, args, options) => {
      // Simulate command execution by calling the stdout listener
      if (options?.listeners?.stdout) {
        options.listeners.stdout(Buffer.from('test output\n'))
      }
      return Promise.resolve(0)
    })

    const result = await generatePrompt(templateContent, undefined, replacements, mockConfig)

    expect(result).toBe(`Before command
test output
After command`)
    expect(exec.exec).toHaveBeenCalledWith(
      'pwsh',
      ['-Command', 'echo "test output"'],
      expect.objectContaining({
        env: expect.objectContaining({
          GH_TOKEN: 'test-token'
        })
      })
    )
    expect(core.info).toHaveBeenCalledWith('Executing command: echo "test output"')
  })

  it('should write output to file when outputPath is provided', async () => {
    const templateContent = 'Hello {{name}}!'
    const replacements = { name: 'World' }
    const outputPath = path.join(process.cwd(), 'test-output.txt')

    // Mock fs.promises methods
    const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined)
    const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('Hello World!')

    const result = await generatePrompt(templateContent, outputPath, replacements, mockConfig)

    expect(result).toBe('Hello World!')
    expect(writeFileSpy).toHaveBeenCalledWith(outputPath, 'Hello World!')
    expect(readFileSpy).toHaveBeenCalledWith(outputPath, 'utf8')
    expect(core.info).toHaveBeenCalledWith('Created prompt from template:')
    expect(core.info).toHaveBeenCalledWith('Hello World!')

    writeFileSpy.mockRestore()
    readFileSpy.mockRestore()
  })

  it('should handle EXEC command errors', async () => {
    const templateContent = 'EXEC: invalid-command'
    const replacements = {}

    // Mock exec to reject with error
    const testError = new Error('Command not found')
    exec.exec.mockRejectedValue(testError)

    await expect(generatePrompt(templateContent, undefined, replacements, mockConfig)).rejects.toThrow(
      'Command not found'
    )

    expect(core.setFailed).toHaveBeenCalledWith("Error executing command 'invalid-command': Error: Command not found")
  })
})
