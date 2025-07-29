// import { jest } from '@jest/globals'
// import {
//   IssueDetails,
//   getHistoricalIssueDetails,
//   getUniqueContributors,
//   getTimeSinceLastActivity,
//   getIssueAge,
//   calculateScore,
//   calculatePreviousScore
// } from '../src/github/issue-details.js'
// import { createEngagementItem } from '../src/engagement/engagement.js'

// describe('IssueDetails', () => {
//   // Mock date for consistent testing
//   const MOCK_NOW = new Date('2023-01-10T12:00:00Z')
//   const MOCK_SEVEN_DAYS_AGO = new Date('2023-01-03T12:00:00Z')

//   const mockIssueDetails: IssueDetails = {
//     id: '1',
//     number: 123,
//     title: 'Test Issue',
//     body: 'Test issue body',
//     state: 'open',
//     created_at: '2023-01-01T12:00:00Z',
//     updated_at: '2023-01-08T12:00:00Z',
//     closed_at: null,
//     reactions: [
//       {
//         user: { login: 'user1', type: 'User' },
//         reaction: 'thumbs_up',
//         createdAt: '2023-01-02T12:00:00Z'
//       },
//       {
//         user: { login: 'user2', type: 'User' },
//         reaction: 'heart',
//         createdAt: '2023-01-05T12:00:00Z'
//       }
//     ],
//     comments: [
//       {
//         user: { login: 'user1', type: 'User' },
//         created_at: '2023-01-02T12:00:00Z',
//         reactions: [
//           {
//             user: { login: 'user3', type: 'User' },
//             reaction: 'thumbs_up',
//             createdAt: '2023-01-02T13:00:00Z'
//           },
//           {
//             user: { login: 'user4', type: 'User' },
//             reaction: 'heart',
//             createdAt: '2023-01-03T12:00:00Z'
//           }
//         ]
//       },
//       {
//         user: { login: 'user2', type: 'User' },
//         created_at: '2023-01-05T12:00:00Z',
//         reactions: [
//           {
//             user: { login: 'user5', type: 'User' },
//             reaction: 'rocket',
//             createdAt: '2023-01-05T13:00:00Z'
//           }
//         ]
//       }
//     ],
//     user: { login: 'author', type: 'User' },
//     assignees: [
//       { login: 'assignee1', type: 'User' },
//       { login: 'assignee2', type: 'User' }
//     ]
//   }

//   beforeEach(() => {
//     jest.useFakeTimers()
//     jest.setSystemTime(MOCK_NOW)
//   })

//   afterEach(() => {
//     jest.useRealTimers()
//   })

//   describe('getHistoricalIssueDetails', () => {
//     it('should return issue with zero activity for issues newer than 7 days', () => {
//       const recentIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2023-01-09T12:00:00Z' // 1 day ago
//       }

//       const result = getHistoricalIssueDetails(recentIssue)

//       expect(result.comments).toBe(0)
//       expect(result.comments_data).toEqual([])
//       expect(result.reactions).toBe(0)
//       expect(result.reactions_data).toEqual([])
//     })

//     it('should filter comments to 7 days ago for older issues', () => {
//       const result = getHistoricalIssueDetails(mockIssueDetails)

//       expect(result.comments).toBe(1) // Only the comment from 2023-01-02
//       expect(result.comments_data).toHaveLength(1)
//       expect(result.comments_data[0].id).toBe(1)
//       expect(result.comments_data[0].user.login).toBe('user1')
//     })

//     it('should filter reactions correctly for historic snapshots', () => {
//       const result = getHistoricalIssueDetails(mockIssueDetails)

//       // Should only include reactions from before 7 days ago (2023-01-02)
//       expect(result.reactions).toBe(1)
//       expect(result.reactions_data).toHaveLength(1)
//       expect(result.reactions_data[0].id).toBe('reaction1')

//       // Should filter comment reactions too
//       expect(result.comments_data[0].reactions).toBe(2)
//       expect(result.comments_data[0].reactions_data).toHaveLength(2)
//     })

//     it('should set updated_at to seven days ago', () => {
//       const result = getHistoricalIssueDetails(mockIssueDetails)

//       expect(result.updated_at).toBe(MOCK_SEVEN_DAYS_AGO.toISOString())
//     })

//     it('should handle empty comments_data', () => {
//       const issueWithoutComments: IssueDetails = {
//         ...mockIssueDetails,
//         comments_data: []
//       }

//       const result = getHistoricalIssueDetails(issueWithoutComments)

//       expect(result.comments).toBe(0)
//       expect(result.comments_data).toEqual([])
//     })

//     it('should handle null comments_data', () => {
//       const issueWithNullComments: IssueDetails = {
//         ...mockIssueDetails,
//         comments_data: null as any
//       }

//       const result = getHistoricalIssueDetails(issueWithNullComments)

//       expect(result.comments).toBe(0)
//       expect(result.comments_data).toEqual([])
//     })
//   })

//   describe('getUniqueContributors', () => {
//     it('should count unique contributors from author, assignees, and comments', () => {
//       const result = getUniqueContributors(mockIssueDetails)

//       // author (1) + assignees (2) + comment authors (2) = 5 unique contributors
//       expect(result).toBe(5)
//     })

//     it('should handle duplicate contributors', () => {
//       const issueWithDuplicates: IssueDetails = {
//         ...mockIssueDetails,
//         user: { login: 'user1', type: 'User' }, // Same as comment author
//         assignees: [
//           { login: 'user2', type: 'User' } // Same as comment author
//         ]
//       }

//       const result = getUniqueContributors(issueWithDuplicates)

//       expect(result).toBe(2) // user1 and user2
//     })

//     it('should handle empty assignees', () => {
//       const issueWithoutAssignees: IssueDetails = {
//         ...mockIssueDetails,
//         assignees: []
//       }

//       const result = getUniqueContributors(issueWithoutAssignees)

//       expect(result).toBe(3) // author + 2 comment authors
//     })

//     it('should handle empty comments', () => {
//       const issueWithoutComments: IssueDetails = {
//         ...mockIssueDetails,
//         comments_data: []
//       }

//       const result = getUniqueContributors(issueWithoutComments)

//       expect(result).toBe(3) // author + 2 assignees
//     })

//     it('should handle null comments_data', () => {
//       const issueWithNullComments: IssueDetails = {
//         ...mockIssueDetails,
//         comments_data: null as any
//       }

//       const result = getUniqueContributors(issueWithNullComments)

//       expect(result).toBe(3) // author + 2 assignees
//     })
//   })

//   describe('getTimeSinceLastActivity', () => {
//     it('should calculate days since last update', () => {
//       const result = getTimeSinceLastActivity(mockIssueDetails)

//       // From 2023-01-08 to 2023-01-10 = 2 days
//       expect(result).toBe(2)
//     })

//     it('should handle same day activity', () => {
//       const todayIssue: IssueDetails = {
//         ...mockIssueDetails,
//         updated_at: '2023-01-10T12:00:00Z'
//       }

//       const result = getTimeSinceLastActivity(todayIssue)

//       expect(result).toBe(0)
//     })

//     it('should handle fractional days by ceiling', () => {
//       const recentIssue: IssueDetails = {
//         ...mockIssueDetails,
//         updated_at: '2023-01-09T18:00:00Z' // 18 hours ago
//       }

//       const result = getTimeSinceLastActivity(recentIssue)

//       expect(result).toBe(1) // Ceiling of 0.75 days
//     })

//     it('should handle very old activity', () => {
//       const oldIssue: IssueDetails = {
//         ...mockIssueDetails,
//         updated_at: '2022-12-01T12:00:00Z'
//       }

//       const result = getTimeSinceLastActivity(oldIssue)

//       expect(result).toBe(40) // About 40 days
//     })
//   })

//   describe('getIssueAge', () => {
//     it('should calculate days since issue creation', () => {
//       const result = getIssueAge(mockIssueDetails)

//       // From 2023-01-01 to 2023-01-10 = 9 days
//       expect(result).toBe(9)
//     })

//     it('should handle same day creation', () => {
//       const todayIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2023-01-10T12:00:00Z'
//       }

//       const result = getIssueAge(todayIssue)

//       expect(result).toBe(0)
//     })

//     it('should handle fractional days by ceiling', () => {
//       const recentIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2023-01-09T18:00:00Z' // 18 hours ago
//       }

//       const result = getIssueAge(recentIssue)

//       expect(result).toBe(1) // Ceiling of 0.75 days
//     })

//     it('should handle very old issues', () => {
//       const oldIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2022-01-01T12:00:00Z'
//       }

//       const result = getIssueAge(oldIssue)

//       expect(result).toBe(374) // About 1 year + 9 days
//     })
//   })

//   describe('calculateScore', () => {
//     it('should calculate score based on weighted algorithm', () => {
//       const result = calculateScore(mockIssueDetails)

//       // Expected calculation:
//       // Comments: 3 * 5 = 15
//       // Reactions: 1 * (10 + 2 + 1) = 13 (issue reactions + comment reactions)
//       // Contributors: 2 * 5 = 10
//       // Last Activity: 1 * (1/2) = 0.5
//       // Issue Age: 1 * (1/9) = 0.111...
//       // Linked PRs: 2 * 0 = 0
//       // Total: 15 + 13 + 10 + 0.5 + 0.111 + 0 = 38.611, rounded = 39

//       expect(result).toBe(39)
//     })

//     it('should handle minimum values for time factors', () => {
//       const sameTimingIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2023-01-10T12:00:00Z',
//         updated_at: '2023-01-10T12:00:00Z'
//       }

//       const result = calculateScore(sameTimingIssue)

//       // Should use Math.max(1, ...) for both time factors
//       expect(result).toBeGreaterThan(0)
//     })

//     it('should handle zero comments', () => {
//       const noCommentsIssue: IssueDetails = {
//         ...mockIssueDetails,
//         comments: 0,
//         comments_data: []
//       }

//       const result = calculateScore(noCommentsIssue)

//       expect(result).toBeGreaterThan(0) // Should still have reactions and contributors
//     })

//     it('should handle zero reactions', () => {
//       const noReactionsIssue: IssueDetails = {
//         ...mockIssueDetails,
//         reactions: 0,
//         reactions_data: [],
//         comments_data: [
//           {
//             user: { login: 'user1', type: 'User' },
//             created_at: '2023-01-02T12:00:00Z',
//             reactions: 0,
//             reactions_data: []
//           }
//         ]
//       }

//       const result = calculateScore(noReactionsIssue)

//       expect(result).toBeGreaterThan(0) // Should still have comments and contributors
//     })

//     it('should handle single contributor', () => {
//       const singleContributorIssue: IssueDetails = {
//         ...mockIssueDetails,
//         assignees: [],
//         comments_data: []
//       }

//       const result = calculateScore(singleContributorIssue)

//       expect(result).toBeGreaterThan(0)
//     })

//     it('should handle empty comments_data gracefully', () => {
//       const issueWithNullComments: IssueDetails = {
//         ...mockIssueDetails,
//         comments_data: null as any
//       }

//       const result = calculateScore(issueWithNullComments)

//       expect(result).toBeGreaterThan(0)
//     })
//   })

//   describe('calculatePreviousScore', () => {
//     it('should calculate score based on historical data', async () => {
//       const result = await calculatePreviousScore(mockIssueDetails)

//       // Should be lower than current score since historic data has less activity
//       const currentScore = calculateScore(mockIssueDetails)
//       expect(result).toBeLessThan(currentScore)
//     })

//     it('should return score > 0 for issues newer than 7 days', async () => {
//       const recentIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2023-01-09T12:00:00Z' // 1 day ago
//       }

//       const result = await calculatePreviousScore(recentIssue)

//       expect(result).toBeGreaterThan(0) // Should still have score from contributors
//     })

//     it('should handle issues with no historic activity', async () => {
//       const noHistoricActivityIssue: IssueDetails = {
//         ...mockIssueDetails,
//         comments_data: [
//           {
//             user: { login: 'user1', type: 'User' },
//             created_at: '2023-01-08T12:00:00Z', // All activity after 7 days ago
//             reactions: 0,
//             reactions_data: []
//           }
//         ]
//       }

//       const result = await calculatePreviousScore(noHistoricActivityIssue)

//       expect(result).toBeGreaterThan(0) // Should still have basic score from contributors
//     })
//   })

//   describe('createEngagementItem', () => {
//     it('should create engagement item for single issue', async () => {
//       const result = await createEngagementItem(mockIssueDetails)

//       expect(result).toEqual({
//         issueNumber: 123,
//         engagement: {
//           score: expect.any(Number),
//           previousScore: expect.any(Number),
//           classification: expect.any(String)
//         }
//       })
//     })

//     it('should create engagement item with project ID', async () => {
//       const result = await createEngagementItem(mockIssueDetails, 'project-item-123')

//       expect(result).toEqual({
//         id: 'project-item-123',
//         issueNumber: 123,
//         engagement: {
//           score: expect.any(Number),
//           previousScore: expect.any(Number),
//           classification: expect.any(String)
//         }
//       })
//     })

//     it('should classify as Hot when current score > previous score', async () => {
//       // Create a specific issue for this test
//       const testIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2023-01-01T12:00:00Z', // Old enough to have historic data
//         comments: 10, // High activity
//         reactions: 20,
//         reactions_data: [
//           {
//             user: { login: 'user1', type: 'User' },
//             reaction: 'thumbs_up',
//             created_at: '2023-01-08T12:00:00Z'
//           }
//         ],
//         comments_data: [
//           {
//             user: { login: 'user1', type: 'User' },
//             created_at: '2023-01-08T12:00:00Z', // Recent comment
//             reactions: 5,
//             reactions_data: [
//               {
//                 user: { login: 'user2', type: 'User' },
//                 reaction: 'heart',
//                 created_at: '2023-01-08T13:00:00Z'
//               }
//             ]
//           }
//         ]
//       }

//       const result = await createEngagementItem(testIssue)

//       expect(result.engagement.classification).toBe('Hot')
//     })

//     it('should classify based on score comparison', async () => {
//       // Create a specific issue for this test with minimal activity
//       const testIssue: IssueDetails = {
//         ...mockIssueDetails,
//         created_at: '2022-12-01T12:00:00Z', // Very old issue
//         comments: 1, // Low activity
//         reactions: 1,
//         reactions_data: [
//           {
//             user: { login: 'user1', type: 'User' },
//             reaction: 'thumbs_up',
//             created_at: '2022-12-02T12:00:00Z'
//           }
//         ],
//         comments_data: [
//           {
//             user: { login: 'user1', type: 'User' },
//             created_at: '2022-12-02T12:00:00Z', // Old comment
//             reactions: 0,
//             reactions_data: []
//           }
//         ]
//       }

//       const currentScore = calculateScore(testIssue)
//       const previousScore = await calculatePreviousScore(testIssue)

//       const result = await createEngagementItem(testIssue)

//       // The test passes if current score <= previous score
//       if (currentScore <= previousScore) {
//         expect(result.engagement.classification).toBeNull()
//       } else {
//         expect(result.engagement.classification).toBe('Hot')
//       }
//     })

//     it('should handle issues with minimal data', async () => {
//       const minimalIssue: IssueDetails = {
//         id: '1',
//         number: 1,
//         title: 'Minimal Issue',
//         body: '',
//         state: 'open',
//         created_at: '2023-01-01T12:00:00Z',
//         updated_at: '2023-01-01T12:00:00Z',
//         closed_at: null,
//         comments: 0,
//         reactions: 0,
//         reactions_data: [],
//         comments_data: [],
//         user: { login: 'user', type: 'User' },
//         assignees: []
//       }

//       const result = await createEngagementItem(minimalIssue)

//       expect(result.issue.number).toBe(1)
//       expect(result.engagement.score).toBeGreaterThan(0)
//       expect(result.engagement.previousScore).toBeGreaterThanOrEqual(0)
//     })
//   })
// })
