/**
 * Mock fixture for GitHub functions (src/github-issues.ts)
 */
import type * as issues from '../src/github-issues.js'
import { jest } from '@jest/globals'

export const commentOnIssue = jest.fn<typeof issues.commentOnIssue>()
export const applyLabelsToIssue = jest.fn<typeof issues.applyLabelsToIssue>()
export const addEyes = jest.fn<typeof issues.addEyes>()
export const removeEyes = jest.fn<typeof issues.removeEyes>()
