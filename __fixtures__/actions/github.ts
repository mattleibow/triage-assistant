import type * as github from '@actions/github'
import { jest } from '@jest/globals'

// Mock GitHub API
const mockCreateComment = jest.fn<typeof octokit.rest.issues.createComment>()
const mockUpdateComment = jest.fn<typeof octokit.rest.issues.updateComment>()
const mockAddLabels = jest.fn<typeof octokit.rest.issues.addLabels>()
const mockRemoveLabel = jest.fn<typeof octokit.rest.issues.removeLabel>()
const mockListLabelsOnIssue = jest.fn<typeof octokit.rest.issues.listLabelsOnIssue>()
const mockCreateForIssue = jest.fn<typeof octokit.rest.reactions.createForIssue>()
const mockListForIssue = jest.fn<typeof octokit.rest.reactions.listForIssue>()
const mockDeleteForIssue = jest.fn<typeof octokit.rest.reactions.deleteForIssue>()
const mockGetIssue = jest.fn<typeof octokit.rest.issues.get>()
const mockListComments = jest.fn<typeof octokit.rest.issues.listComments>()

export const mockOctokit = {
  rest: {
    issues: {
      createComment: mockCreateComment,
      updateComment: mockUpdateComment,
      addLabels: mockAddLabels,
      removeLabel: mockRemoveLabel,
      listLabelsOnIssue: mockListLabelsOnIssue,
      get: mockGetIssue,
      listComments: mockListComments
    },
    reactions: {
      createForIssue: mockCreateForIssue,
      listForIssue: mockListForIssue,
      deleteForIssue: mockDeleteForIssue
    }
  }
}

export const mockContext = {
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  },
  issue: undefined as unknown
}

export const octokit = mockOctokit as unknown as ReturnType<typeof github.getOctokit>
export const context = mockContext as unknown as typeof github.context
