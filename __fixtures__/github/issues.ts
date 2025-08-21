/**
 * Mock fixture for GitHub functions (src/github/issues.ts)
 */
import type * as issues from '../../src/github/issues.js'
import { jest } from '@jest/globals'

export const commentOnIssue = jest.fn<typeof issues.commentOnIssue>()
export const applyLabelsToIssue = jest.fn<typeof issues.applyLabelsToIssue>()
export const addEyes = jest.fn<typeof issues.addEyes>()
export const removeEyes = jest.fn<typeof issues.removeEyes>()
export const getIssueDetails = jest.fn<typeof issues.getIssueDetails>()
export const searchIssues = jest.fn<typeof issues.searchIssues>()
export const applyLabelsToBulkIssues = jest.fn<typeof issues.applyLabelsToBulkIssues>()
