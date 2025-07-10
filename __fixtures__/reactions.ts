/**
 * Mock fixture for GitHub functions (src/reactions.ts)
 */
import type * as reactions from '../src/reactions.js'
import { jest } from '@jest/globals'

export const addEyes = jest.fn<typeof reactions.addEyes>()
export const removeEyes = jest.fn<typeof reactions.removeEyes>()
