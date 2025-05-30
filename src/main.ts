import * as core from '@actions/core'
import * as github from '@actions/github'
import * as os from 'os'
import { selectLabels } from './select-labels.js'
import { applyLabelsAndComment } from './apply.js'
import { TriageConfig } from './triage-config.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(`An unknown error occurred: ${JSON.stringify(error)}`)
    }
  }
}
