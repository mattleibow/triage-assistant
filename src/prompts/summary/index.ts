import { systemPrompt } from './system-prompt.js'
import { userPrompt } from './user-prompt.js'

/**
 * Dictionary mapping template names to their content.
 * Contains all available prompt templates for applying labels.
 */
export const PROMPTS: Record<string, string> = {
  system: systemPrompt,
  user: userPrompt
}

/**
 * Available template names for applying labels.
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
    throw new Error(`Template '${templateName}' not found. Available templates: ${TEMPLATE_NAMES.join(', ')}`)
  }
  return prompt
}
