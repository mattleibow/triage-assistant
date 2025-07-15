/**
 * Mock fixture for AI functions (src/ai.ts)
 */
import type * as ai from '../src/ai.js'
import { jest } from '@jest/globals'

export const runInference = jest.fn<typeof ai.runInference>()
