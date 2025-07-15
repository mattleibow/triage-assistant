/**
 * Mock fixture for summary functions (src/prompts-summary.ts)
 */
import type * as summary from '../src/prompts-summary.js'
import { jest } from '@jest/globals'

export const generateSummary = jest.fn<typeof summary.generateSummary>()
export const mergeResponses = jest.fn<typeof summary.mergeResponses>()
