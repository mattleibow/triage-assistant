import * as core from '@actions/core'
import * as exec from '@actions/exec'
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference'
import { AzureKeyCredential } from '@azure/core-auth'
import * as fs from 'fs'
import * as path from 'path'
import { TriageConfig } from './triage-config.js'

/**
 * Generates a prompt from a template string or file by replacing placeholders and executing commands.
 *
 * @param templateContent The template content as a string.
 * @param outputPath The path where the generated prompt will be written.
 * @param replacements Record of placeholder keys and their replacement values.
 * @param token GitHub token for authentication when executing commands.
 * @returns Promise that resolves when the prompt is generated and written to the output file.
 */
export async function generatePrompt(
  templateContent: string,
  outputPath: string,
  replacements: Record<string, any>,
  config: TriageConfig
): Promise<void> {
  const lines = templateContent.split('\n')
  const outputContent: string[] = []

  for (let line of lines) {
    // Replace placeholders
    for (const [key, value] of Object.entries(replacements)) {
      line = line.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    // Check for EXEC: command prefix
    const execMatch = line.match(/^EXEC:\s*(.+)$/)
    if (execMatch) {
      const command = execMatch[1]
      core.info(`Executing command: ${command}`)

      try {
        let output = ''
        await exec.exec(command, [], {
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

  await fs.promises.writeFile(outputPath, outputContent.join('\n'))

  // Log the created prompt for debugging
  core.info('Created prompt from template:')
  const createdContent = await fs.promises.readFile(outputPath, 'utf8')
  core.info(createdContent)
}

/**
 * Runs AI inference to generate a response file.
 *
 * @param systemPrompt The system prompt content.
 * @param userPrompt The user prompt content.
 * @param responseFile Path to write the response file.
 * @param config The triage configuration object.
 * @param maxTokens Optional maximum tokens limit (default: 200).
 */
export async function runInference(
  systemPrompt: string,
  userPrompt: string,
  responseFile: string,
  maxTokens: number = 200,
  config: TriageConfig
): Promise<void> {
  try {
    // Create Azure AI client
    const client = ModelClient(
      config.aiEndpoint,
      new AzureKeyCredential(config.token),
      {
        userAgentOptions: { userAgentPrefix: 'github-actions-triage-assistant' }
      }
    )

    // Make the AI inference request
    const response = await client.path('/chat/completions').post({
      body: {
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: maxTokens,
        model: config.aiModel
      }
    })

    if (isUnexpected(response)) {
      if (response.body.error) {
        throw response.body.error
      }
      throw new Error(
        `An error occurred while fetching the response (${response.status}): ${response.body}`
      )
    }

    const modelResponse: string = response.body.choices[0].message.content || ''

    // Ensure the response directory exists
    await fs.promises.mkdir(path.dirname(responseFile), { recursive: true })

    // Write the response to the specified file
    await fs.promises.writeFile(responseFile, modelResponse, 'utf-8')

    core.info(`AI inference completed. Response written to: ${responseFile}`)
  } catch (error) {
    core.error(
      `AI inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    throw error
  }
}
