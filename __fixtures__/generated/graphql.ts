import type * as graphql from '../../src/generated/graphql.js'
import { jest } from '@jest/globals'

// Mock GitHub API
const mockGetIssueDetails = jest.fn<typeof getSdk.GetIssueDetails>()

export const mockGetSdk = {
  GetIssueDetails: mockGetIssueDetails
}

export const getSdk = mockGetSdk as unknown as ReturnType<typeof graphql.getSdk>
