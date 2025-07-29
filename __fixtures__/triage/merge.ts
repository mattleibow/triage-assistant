/**
 * Mock fixture for summary functions (src/triage/merge.ts)
 */
import type * as merge from '../../src/triage/merge.js'
import { jest } from '@jest/globals'

export const mergeResponses = jest.fn<typeof merge.mergeResponses>()
