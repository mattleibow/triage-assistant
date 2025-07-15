import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getPrompt } from './prompts/select-labels/index.js'
import { generatePrompt } from './prompts.js'
import { runInference } from './ai.js'
import { SelectLabelsPromptConfig } from './triage-config.js'

/**
 * Selects labels for an issue using AI inference based on a template.
 *
 * @param config The select labels configuration object.
 * @returns Promise that resolves with the path to the response file.
 */
export async function selectLabels(config: SelectLabelsPromptConfig): Promise<string> {
  const guid = uuidv4()
  const promptDir = path.join(config.tempDir, 'triage-labels', 'prompts', guid)
  const responseDir = path.join(config.tempDir, 'triage-assistant', 'responses')

  // Ensure directories exist
  await fs.promises.mkdir(promptDir, { recursive: true })
  await fs.promises.mkdir(responseDir, { recursive: true })

  // Generate system prompt
  const systemPromptPath = path.join(promptDir, 'system-prompt.md')
  await generatePrompt(
    getPrompt(config.template),
    systemPromptPath,
    {
      ISSUE_NUMBER: config.issueNumber,
      ISSUE_REPO: config.repository,
      LABEL_PREFIX: config.labelPrefix,
      LABEL: config.label
    },
    config
  )

  // Generate user prompt
  const userPromptPath = path.join(promptDir, 'user-prompt.md')
  await generatePrompt(
    getPrompt('user'),
    userPromptPath,
    {
      ISSUE_NUMBER: config.issueNumber,
      ISSUE_REPO: config.repository,
      LABEL_PREFIX: config.labelPrefix,
      LABEL: config.label
    },
    config
  )

  // Run AI inference
  const responseFile = path.join(responseDir, `response-${guid}.json`)
  const systemPrompt = await fs.promises.readFile(systemPromptPath, 'utf8')
  const userPrompt = await fs.promises.readFile(userPromptPath, 'utf8')
  await runInference(systemPrompt, userPrompt, responseFile, 200, config)

  return responseFile
}
