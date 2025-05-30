import { systemPromptSingleLabel } from './system-prompt-single-label.js'
import { systemPromptMultiLabel } from './system-prompt-multi-label.js'
import { systemPromptRegression } from './system-prompt-regression.js'
import { systemPromptMissingInfo } from './system-prompt-missing-info.js'
import { userPrompt } from './user-prompt.js'

/**
 * Dictionary mapping template names to their content.
 * Contains all available prompt templates for label selection.
 */
export const PROMPTS: Record<string, string> = {
  'single-label': systemPromptSingleLabel,
  'multi-label': systemPromptMultiLabel,
  regression: systemPromptRegression,
  'missing-info': systemPromptMissingInfo,
  user: userPrompt
}

/**
 * Available template names for label selection.
 */
export const TEMPLATE_NAMES = Object.keys(PROMPTS)

/**
 * Type for valid template names.
 */
export type TemplateName = (typeof TEMPLATE_NAMES)[number]

/**
 * Gets the prompt content for a given template name.
 *
 * @param templateName The name of the template to retrieve
 * @returns The prompt content for the specified template
 * @throws Error if the template name is not found
 */
export function getPrompt(templateName: TemplateName): string {
  const prompt = PROMPTS[templateName]
  if (!prompt) {
    throw new Error(
      `Template '${templateName}' not found. Available templates: ${TEMPLATE_NAMES.join(', ')}`
    )
  }
  return prompt
}
