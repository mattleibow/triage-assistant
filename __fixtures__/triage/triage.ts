/**
 * Mock fixture for summary functions (src/triage/merge.ts)
 */
import type * as triage from '../../src/triage/triage.js'
import { jest } from '@jest/globals'

export const runTriageWorkflow = jest.fn<typeof triage.runTriageWorkflow>()
export const mergeAndApplyTriage = jest.fn<typeof triage.mergeAndApplyTriage>()
