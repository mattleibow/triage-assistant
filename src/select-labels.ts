import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getPrompt } from './prompts/select-labels/index.js'
import { generatePrompt, runInference } from './ai.js'
import { SelectLabelsPromptConfig, TriageConfig } from './triage-config.js'
import { applyLabelsAndComment, manageReactions } from './apply.js'

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

/**
 * Run the complete triage workflow for labels and comments
 * @param config - The triage configuration
 * @returns Promise<string> - The response file path
 */
export async function runTriageWorkflow(config: TriageConfig): Promise<string> {
  const shouldAddLabels = config.template ? true : false
  const shouldAddSummary = config.applyLabels || config.applyComment
  const shouldAddReactions = shouldAddLabels || shouldAddSummary

  let responseFile = ''

  try {
    // Step 1: Add eyes reaction at the start
    if (shouldAddReactions) {
      await manageReactions(config, true)
    }

    // Step 2: Select labels if template is provided
    if (shouldAddLabels) {
      responseFile = await selectLabels(config)
    }

    // Step 3: Apply labels and comment if requested
    if (shouldAddSummary) {
      await applyLabelsAndComment(config)
    }

    return responseFile
  } catch (error) {
    throw error
  } finally {
    // Always remove eyes reaction at the end
    await manageReactions(config, false)
  }
}
