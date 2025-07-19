import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import { PromptGenerationConfig } from '../config.js'

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
  core.debug(templateContent)

  const lines = templateContent.split('\n')
  const outputContent: string[] = []

  for (let line of lines) {
    // Replace placeholders
    for (const [key, value] of Object.entries(replacements)) {
      line = line.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''))
    }

    // Check for EXEC: command prefix
    const execMatch = line.match(/^EXEC:\s*(.+)$/)
    if (execMatch) {
      const command = execMatch[1]
      core.info(`Executing command: ${command}`)

      try {
        let output = ''

        await exec.exec('pwsh', ['-Command', command], {
          listeners: {
            stdout: (data: Buffer) => {
              output += data.toString()
            }
          },
          env: {
            ...process.env,
            GH_TOKEN: config.token
          }
        })

        const result = output.trim().split('\n')
        outputContent.push(...result)
      } catch (error) {
        core.setFailed(`Error executing command '${command}': ${error}`)
        throw error
      }
    } else {
      outputContent.push(line)
    }
  }

  const output = outputContent.join('\n')

  if (outputPath) {
    core.debug(`Writing generated prompt to file: ${outputPath}`)
    await fs.promises.writeFile(outputPath, output)

    // Log the created prompt for debugging
    const createdContent = await fs.promises.readFile(outputPath, 'utf8')
    core.debug(`Generated prompt file contained:`)
    core.debug(createdContent)
  }

  core.info(`Created prompt from template:`)
  core.info(output)

  return output
}
