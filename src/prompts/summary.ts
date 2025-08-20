import * as fs from 'fs'
import * as path from 'path'
import { getPrompt } from './summary/index.js'
import { generatePrompt } from './prompts.js'
import { runInference } from '../ai/ai.js'
import { InferenceConfig, SummaryPromptConfig, TriageConfig } from '../config.js'

/**
 * Generates a summary of the merged response using AI inference.
 *
 * @param config The triage configuration object.
 * @param mergedResponseFile Path to the merged response JSON file.
 * @returns Promise that resolves with the path to the summary response file.
 */
export async function generateSummary(
  config: SummaryPromptConfig & InferenceConfig & TriageConfig,
  mergedResponseFile: string
) {
  const summaryDir = path.join(config.tempDir, 'triage-apply', 'prompts')
  const summaryResponseFile = path.join(config.tempDir, 'triage-apply', 'responses', 'response.md')

  // Ensure directories exist
  await fs.promises.mkdir(summaryDir, { recursive: true })
  await fs.promises.mkdir(path.dirname(summaryResponseFile), { recursive: true })

  // Generate system prompt
  const systemPromptPath = path.join(summaryDir, 'system-prompt.md')
  await generatePromptFile('system', systemPromptPath, config, mergedResponseFile)

  // Generate user prompt
  const userPromptPath = path.join(summaryDir, 'user-prompt.md')
  await generatePromptFile('user', userPromptPath, config, mergedResponseFile)

  // Run AI inference to generate the summary
  const systemPrompt = await fs.promises.readFile(systemPromptPath, 'utf8')
  const userPrompt = await fs.promises.readFile(userPromptPath, 'utf8')
  await runInference(systemPrompt, userPrompt, summaryResponseFile, 500, {
    aiEndpoint: config.aiEndpoint,
    aiModel: config.aiModel,
    aiToken: config.aiToken
  })

  return summaryResponseFile
}

/**
 * Generates a prompt file based on the provided template and configuration.
 *
 * @param template The template prompt to use.
 * @param promptPath The path to write the generated prompt file.
 * @param config The configuration object containing template and replacements.
 * @param mergedResponseFile Path to the merged response JSON file.
 */
async function generatePromptFile(
  template: string,
  promptPath: string,
  config: SummaryPromptConfig,
  mergedResponseFile: string
) {
  await generatePrompt(
    getPrompt(template),
    promptPath,
    {
      ISSUE_NUMBER: config.issueNumber.toString(),
      ISSUE_REPO: config.repository,
      MERGED_JSON: mergedResponseFile
    },
    config
  )
}
