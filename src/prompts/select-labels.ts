import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getPrompt } from './select-labels/index.js'
import { generatePrompt } from './prompts.js'
import { runInference } from '../ai/ai.js'
import { InferenceConfig, SelectLabelsPromptConfig, TriageConfig } from '../config.js'

/**
 * Selects labels for an issue using AI inference based on a template.
 *
 * @param config The select labels configuration object.
 * @returns Promise that resolves with the path to the response file.
 */
export async function selectLabels(
  template: string,
  config: SelectLabelsPromptConfig & InferenceConfig & TriageConfig
): Promise<string> {
  const guid = uuidv4()
  const promptDir = path.join(config.tempDir, 'triage-labels', 'prompts', guid)
  const responseDir = path.join(config.tempDir, 'triage-assistant', 'responses')

  // Ensure directories exist
  await fs.promises.mkdir(promptDir, { recursive: true })
  await fs.promises.mkdir(responseDir, { recursive: true })

  // Generate system prompt
  const systemPromptPath = path.join(promptDir, 'system-prompt.md')
  await generatePromptFile(template, config, systemPromptPath)

  // Generate user prompt
  const userPromptPath = path.join(promptDir, 'user-prompt.md')
  await generatePromptFile('user', config, userPromptPath)

  // Run AI inference to generate
  const systemPrompt = await fs.promises.readFile(systemPromptPath, 'utf8')
  const userPrompt = await fs.promises.readFile(userPromptPath, 'utf8')
  const responseFile = path.join(responseDir, `response-${guid}.json`)
  await runInference(systemPrompt, userPrompt, responseFile, 200, config)

  return responseFile
}

/** * Generates a prompt file based on the provided template and configuration.
 *
 * @param template The template prompt to use.
 * @param config The configuration object containing template and replacements.
 * @param systemPromptPath The path to write the generated system prompt file.
 */
async function generatePromptFile(template: string, config: SelectLabelsPromptConfig, systemPromptPath: string) {
  await generatePrompt(
    getPrompt(template),
    systemPromptPath,
    {
      ISSUE_NUMBER: config.issueNumber,
      ISSUE_REPO: config.repository,
      LABEL_PREFIX: config.labelPrefix,
      LABEL: config.label
    },
    config
  )
}
