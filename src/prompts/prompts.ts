import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as utils from '../utils.js'
import { PromptGenerationConfig } from '../config.js'

/**
 * Validates and sanitizes a command before execution to prevent injection attacks
 * @param command The command to validate
 * @returns The sanitized command or throws an error if unsafe
 */
function validateAndSanitizeCommand(command: string): string {
  // Allow only specific safe commands that we expect
  const allowedCommands = [
    /^gh\s+api\s+"repos\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/issues\/\d+"\s+--cache\s+\d+s\s+--jq\s+'.+'/,
    /^gh\s+label\s+list\s+--limit\s+\d+\s+--json\s+name,description\s+--search\s+".+"\s+--jq\s+'.+'/,
    /^jq\s+-r\s+'.+'\s+[a-zA-Z0-9._/-]+$/
  ]
  
  const sanitizedCommand = command.trim()
  
  // Check if command matches allowed patterns
  const isAllowed = allowedCommands.some(pattern => pattern.test(sanitizedCommand))
  
  if (!isAllowed) {
    throw new Error(`Command not allowed for security reasons: ${sanitizedCommand}`)
  }
  
  // Additional validation - check for dangerous characters
  const dangerousPatterns = [
    /[;&|`$(){}[\]\\><]/,  // Command injection characters
    /\|\s*\w+/,            // Pipe to other commands (except jq which is allowed)
    />\s*\/|\s*>.*\.\.\//,  // File redirection to dangerous paths
    /rm\s+|del\s+|format\s+/i, // Dangerous system commands
    /wget\s+|curl\s+|invoke-webrequest/i // Network commands
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitizedCommand) && !sanitizedCommand.startsWith('jq ')) {
      throw new Error(`Command contains dangerous patterns: ${sanitizedCommand}`)
    }
  }
  
  return sanitizedCommand
}

/**
 * Generates a prompt from a template string or file by replacing placeholders and executing commands.
 *
 * @param templateContent The template content as a string.
 * @param outputPath Optional path where the generated prompt will be written.
 * @param replacements Record of placeholder keys and their replacement values.
 * @param config Configuration object containing token for external service access.
 * @returns Promise that resolves to the generated prompt content.
 */
export async function generatePrompt(
  templateContent: string,
  outputPath: string | undefined,
  replacements: Record<string, unknown>,
  config: PromptGenerationConfig
): Promise<string> {
  core.debug(`Generating prompt from template:`)
  core.debug(utils.sanitizeForLogging(templateContent))

  const lines = templateContent.split('\n')
  const outputContent: string[] = []

  for (let line of lines) {
    // Replace placeholders safely with input sanitization
    line = utils.substituteTemplateVariables(line, replacements)

    // Check for EXEC: command prefix
    const execMatch = line.match(/^EXEC:\s*(.+)$/)
    if (execMatch) {
      const rawCommand = execMatch[1]
      
      try {
        // Validate and sanitize the command
        const sanitizedCommand = validateAndSanitizeCommand(rawCommand)
        core.info(`Executing sanitized command: ${utils.sanitizeForLogging(sanitizedCommand)}`)

        let output = ''

        // Use minimal environment - only pass required token
        const minimalEnv = {
          GH_TOKEN: config.token,
          PATH: process.env.PATH || '',
          HOME: process.env.HOME || '',
        }

        await exec.exec('pwsh', ['-Command', sanitizedCommand], {
          listeners: {
            stdout: (data: Buffer) => {
              output += data.toString()
            }
          },
          env: minimalEnv // Use minimal environment instead of full process.env
        })

        const result = output.trim().split('\n')
        outputContent.push(...result)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        core.error(`Error executing command '${utils.sanitizeForLogging(rawCommand)}': ${errorMessage}`)
        throw new Error(`Command execution failed: ${errorMessage}`)
      }
    } else {
      outputContent.push(line)
    }
  }

  const output = outputContent.join('\n')

  if (outputPath) {
    // Validate output path to prevent path traversal
    const safeOutputPath = utils.safePath(process.cwd(), outputPath)
    core.debug(`Writing generated prompt to file: ${safeOutputPath}`)
    await fs.promises.writeFile(safeOutputPath, output)

    // Log the created prompt for debugging (sanitized)
    const createdContent = await fs.promises.readFile(safeOutputPath, 'utf8')
    core.debug(`Generated prompt file contained:`)
    core.debug(utils.sanitizeForLogging(createdContent))
  }

  core.info(`Created prompt from template:`)
  core.info(utils.sanitizeForLogging(output))

  return output
}
