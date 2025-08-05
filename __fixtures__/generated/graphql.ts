import type * as graphql from '../../src/generated/graphql.js'
import { jest } from '@jest/globals'

// Mock GitHub API
const mockGetIssueDetails = jest.fn<typeof getSdk.GetIssueDetails>()
const mockGetProjectFields = jest.fn<typeof getSdk.GetProjectFields>()
const mockGetProjectItems = jest.fn<typeof getSdk.GetProjectItems>()
const mockUpdateProjectItemField = jest.fn<typeof getSdk.UpdateProjectItemField>()

export const mockGetSdk = {
  GetIssueDetails: mockGetIssueDetails,
  GetProjectFields: mockGetProjectFields,
  GetProjectItems: mockGetProjectItems,
  UpdateProjectItemField: mockUpdateProjectItemField
}

export const getSdk = mockGetSdk as unknown as ReturnType<typeof graphql.getSdk>
