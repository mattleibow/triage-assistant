/**
 * Mock fixture for prompt functions (src/prompts/prompts.ts)
 */
import type * as prompts from '../../src/prompts/prompts.js'
import { jest } from '@jest/globals'

export const generatePrompt = jest.fn<typeof prompts.generatePrompt>()
