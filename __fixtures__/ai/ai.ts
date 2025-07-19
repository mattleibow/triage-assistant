/**
 * Mock fixture for AI functions (src/ai/ai.ts)
 */
import type * as ai from '../../src/ai/ai.js'
import { jest } from '@jest/globals'

export const runInference = jest.fn<typeof ai.runInference>()
