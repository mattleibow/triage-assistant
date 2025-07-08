/**
 * Mock fixture for GitHub functions (src/github.ts)
 */
import type * as github from '../src/github.js'
import { jest } from '@jest/globals'

export const commentOnIssue = jest.fn<typeof github.commentOnIssue>()
export const applyLabelsToIssue = jest.fn<typeof github.applyLabelsToIssue>()
