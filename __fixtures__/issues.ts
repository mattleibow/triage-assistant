/**
 * Mock fixture for GitHub functions (src/github.ts)
 */
import type * as issues from '../src/issues.js'
import { jest } from '@jest/globals'

export const commentOnIssue = jest.fn<typeof issues.commentOnIssue>()
export const applyLabelsToIssue = jest.fn<typeof issues.applyLabelsToIssue>()
