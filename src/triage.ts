import { selectLabels } from './prompts-select-labels.js'
import { applyLabelsAndComment, manageReactions } from './github-apply.js'
import { EverythingConfig } from './triage-config.js'

/**
 * Run the normal triage workflow
 */
export async function runTriageWorkflow(config: EverythingConfig): Promise<string> {
  const shouldAddLabels = config.template ? true : false
  const shouldAddSummary = config.applyLabels || config.applyComment
  const shouldAddReactions = shouldAddLabels || shouldAddSummary
  let shouldRemoveReactions = shouldAddSummary

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
    // Don't remove reactions on error
    shouldRemoveReactions = false
    throw error
  } finally {
    // Step 4: Remove eyes reaction at the end if needed
    if (shouldRemoveReactions) {
      await manageReactions(config, false)
    }
  }
}
