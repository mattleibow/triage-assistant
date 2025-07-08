/**
 * Mock fixture for AI functions (src/ai.ts)
 */
import type * as aiReal from '../src/ai.js'
import { jest } from '@jest/globals'

export const generatePrompt = jest.fn<typeof aiReal.generatePrompt>()
export const runInference = jest.fn<typeof aiReal.runInference>()
