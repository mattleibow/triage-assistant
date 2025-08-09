import * as core from '@actions/core'
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference'
import { AzureKeyCredential } from '@azure/core-auth'
import * as fs from 'fs'
import * as path from 'path'
import { InferenceConfig } from '../config.js'

/**
 * Sanitizes content for safe logging by truncating and removing potential sensitive data
 * @param content Content to sanitize
 * @param maxLength Maximum length for logged content
 * @returns Sanitized content safe for logging
 */
function sanitizeForLogging(content: string, maxLength: number = 200): string {
  // Remove potential tokens, keys, secrets (basic patterns)
  const sensitivePatterns = [
    /(?:token|key|secret|password)[\s:=]+[a-zA-Z0-9+/=_-]{20,}/gi,
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
    /github_pat_[a-zA-Z0-9_]{82}/g, // GitHub fine-grained tokens
  ]
  
  let sanitized = content
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })
  
  // Truncate for logging
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...[truncated]'
  }
  
  return sanitized
}

/**
 * Runs AI inference to generate a response file.
 *
 * @param systemPrompt The system prompt content.
 * @param userPrompt The user prompt content.
 * @param responseFile Path to write the response file.
 * @param maxTokens Optional maximum tokens limit (default: 200).
 * @param config The inference configuration object.
 */
export async function runInference(
  systemPrompt: string,
  userPrompt: string,
  responseFile: string,
  maxTokens: number = 200,
  config: InferenceConfig
): Promise<void> {
  core.debug(`Running inference...`)

  try {
    // Create Azure AI client
    const client = ModelClient(config.aiEndpoint, new AzureKeyCredential(config.aiToken), {
      userAgentOptions: { userAgentPrefix: 'github-actions-triage-assistant' }
    })

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
      if (response.body?.error) {
        throw response.body.error
      }
      throw new Error(`An error occurred while fetching the response (${response.status}): ${response.body}`)
    }

    const modelResponse: string = response.body.choices[0].message.content || ''

    // Ensure the response directory exists
    await fs.promises.mkdir(path.dirname(responseFile), { recursive: true })

    // Write the response to the specified file
    await fs.promises.writeFile(responseFile, modelResponse, 'utf-8')

    core.info(`AI inference completed. Response written to: ${responseFile}`)
    core.info(`Response content: ${sanitizeForLogging(modelResponse)}`)
  } catch (error) {
    core.error(`AI inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}
