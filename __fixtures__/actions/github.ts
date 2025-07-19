import type * as github from '@actions/github'
import { jest } from '@jest/globals'

// export const getOctokit = jest.fn()

// Mock GitHub API
const mockCreateComment = jest.fn()
const mockAddLabels = jest.fn()
const mockCreateForIssue = jest.fn()
const mockListForIssue = jest.fn()
const mockDeleteForIssue = jest.fn()
const mockGetIssue = jest.fn()
const mockListComments = jest.fn()

export const octokit = {
  rest: {
    issues: {
      createComment: mockCreateComment,
      addLabels: mockAddLabels,
      get: mockGetIssue,
      listComments: mockListComments
    },
    reactions: {
      createForIssue: mockCreateForIssue,
      listForIssue: mockListForIssue,
      deleteForIssue: mockDeleteForIssue
    }
  }
} as unknown as ReturnType<typeof github.getOctokit>
