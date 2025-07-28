import { jest } from '@jest/globals'
import * as github from '@actions/github'
import * as core from '@actions/core'
import {
  getAllProjectItems,
  updateProjectWithScores,
  getProjectField,
  updateProjectItem
} from '../src/github/projects.js'
import { EverythingConfig } from '../src/config.js'
import { EngagementResponse, EngagementClassification } from '../src/engagement/engagement-types.js'

// Mock GitHub API
const mockGraphql = jest.fn() as jest.MockedFunction<any>
const mockOctokit = {
  graphql: mockGraphql
} as unknown as ReturnType<typeof github.getOctokit>

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn()
}))

const mockConfig: EverythingConfig = {
  dryRun: false,
  repoOwner: 'test-owner',
  repoName: 'test-repo',
  issueNumber: 123,
  projectNumber: 123,
  projectColumn: 'Engagement Score',
  applyScores: true,
  token: 'test-token',
  tempDir: '/tmp',
  repository: 'test-owner/test-repo',
  aiEndpoint: 'test-endpoint',
  aiModel: 'test-model',
  aiToken: 'test-ai-token',
  applyComment: true,
  applyLabels: true,
  commentFooter: 'Test footer'
}

const mockEngagementResponse: EngagementResponse = {
  items: [
    {
      id: 'project-item-1',
      issue: {
        id: 'issue-1',
        owner: 'test-owner',
        repo: 'test-repo',
        number: 1
      },
      engagement: {
        score: 50,
        previousScore: 30,
        classification: EngagementClassification.Hot
      }
    },
    {
      id: 'project-item-2',
      issue: {
        id: 'issue-2',
        owner: 'test-owner',
        repo: 'test-repo',
        number: 2
      },
      engagement: {
        score: 20,
        previousScore: 25,
        classification: undefined
      }
    }
  ],
  totalItems: 2
}

describe('GitHub Projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllProjectItems', () => {
    it('should fetch all project items with pagination', async () => {
      // Mock first page
      mockGraphql
        .mockResolvedValueOnce({
          repository: {
            projectV2: {
              id: 'project-123',
              items: {
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'cursor-1'
                },
                nodes: [
                  {
                    id: 'item-1',
                    content: {
                      number: 1,
                      repository: {
                        name: 'test-repo',
                        owner: { login: 'test-owner' }
                      }
                    }
                  }
                ]
              }
            }
          }
        })
        // Mock second page
        .mockResolvedValueOnce({
          repository: {
            projectV2: {
              id: 'project-123',
              items: {
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null
                },
                nodes: [
                  {
                    id: 'item-2',
                    content: {
                      number: 2,
                      repository: {
                        name: 'test-repo',
                        owner: { login: 'test-owner' }
                      }
                    }
                  }
                ]
              }
            }
          }
        })

      const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

      expect(result).toEqual([
        {
          id: 'item-1',
          projectId: 'project-123',
          content: {
            type: 'issue',
            owner: 'test-owner',
            repo: 'test-repo',
            number: 1
          }
        },
        {
          id: 'item-2',
          projectId: 'project-123',
          content: {
            type: 'issue',
            owner: 'test-owner',
            repo: 'test-repo',
            number: 2
          }
        }
      ])

      expect(mockGraphql).toHaveBeenCalledTimes(2)
    })

//     it('should handle single page results', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             items: {
//               pageInfo: {
//                 hasNextPage: false,
//                 endCursor: null
//               },
//               nodes: [
//                 {
//                   id: 'item-1',
//                   content: {
//                     number: 1,
//                     repository: {
//                       name: 'test-repo',
//                       owner: { login: 'test-owner' }
//                     }
//                   }
//                 }
//               ]
//             }
//           }
//         }
//       })

//       const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

//       expect(result).toHaveLength(1)
//       expect(mockGraphql).toHaveBeenCalledTimes(1)
//     })

//     it('should handle empty project', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             items: {
//               pageInfo: {
//                 hasNextPage: false,
//                 endCursor: null
//               },
//               nodes: []
//             }
//           }
//         }
//       })

//       const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

//       expect(result).toEqual([])
//     })

//     it('should filter out items without content', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             items: {
//               pageInfo: {
//                 hasNextPage: false,
//                 endCursor: null
//               },
//               nodes: [
//                 {
//                   id: 'item-1',
//                   content: {
//                     number: 1,
//                     repository: {
//                       name: 'test-repo',
//                       owner: { login: 'test-owner' }
//                     }
//                   }
//                 },
//                 {
//                   id: 'item-2',
//                   content: null // No content
//                 }
//               ]
//             }
//           }
//         }
//       })

//       const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

//       expect(result).toHaveLength(1)
//       expect(result[0].id).toBe('item-1')
//     })

//     it('should filter out items without number', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             items: {
//               pageInfo: {
//                 hasNextPage: false,
//                 endCursor: null
//               },
//               nodes: [
//                 {
//                   id: 'item-1',
//                   content: {
//                     number: 1,
//                     repository: {
//                       name: 'test-repo',
//                       owner: { login: 'test-owner' }
//                     }
//                   }
//                 },
//                 {
//                   id: 'item-2',
//                   content: {
//                     number: null, // No number
//                     repository: {
//                       name: 'test-repo',
//                       owner: { login: 'test-owner' }
//                     }
//                   }
//                 }
//               ]
//             }
//           }
//         }
//       })

//       const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

//       expect(result).toHaveLength(1)
//       expect(result[0].id).toBe('item-1')
//     })

//     it('should throw error when project not found', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: null
//         }
//       })

//       await expect(getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)).rejects.toThrow(
//         'Project #123 not found'
//       )
//     })

//     it('should handle cross-repository project items', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             items: {
//               pageInfo: {
//                 hasNextPage: false,
//                 endCursor: null
//               },
//               nodes: [
//                 {
//                   id: 'item-1',
//                   content: {
//                     number: 1,
//                     repository: {
//                       name: 'other-repo',
//                       owner: { login: 'other-owner' }
//                     }
//                   }
//                 }
//               ]
//             }
//           }
//         }
//       })

//       const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

//       expect(result[0].content).toEqual({
//         type: 'issue',
//         owner: 'other-owner',
//         repo: 'other-repo',
//         number: 1
//       })
//     })
//   })

//   describe('getProjectField', () => {
//     it('should find project field by name', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             fields: {
//               nodes: [
//                 {
//                   id: 'field-1',
//                   name: 'Status',
//                   dataType: 'SINGLE_SELECT'
//                 },
//                 {
//                   id: 'field-2',
//                   name: 'Engagement Score',
//                   dataType: 'TEXT'
//                 }
//               ]
//             }
//           }
//         }
//       })

//       const result = await getProjectField(mockOctokit, 'test-owner', 'test-repo', 123, 'Engagement Score')

//       expect(result).toEqual({
//         id: 'field-2',
//         name: 'Engagement Score'
//       })
//     })

//     it('should return null when field not found', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             fields: {
//               nodes: [
//                 {
//                   id: 'field-1',
//                   name: 'Status',
//                   dataType: 'SINGLE_SELECT'
//                 }
//               ]
//             }
//           }
//         }
//       })

//       const result = await getProjectField(mockOctokit, 'test-owner', 'test-repo', 123, 'Nonexistent Field')

//       expect(result).toBeNull()
//     })

//     it('should return null when project not found', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: null
//         }
//       })

//       const result = await getProjectField(mockOctokit, 'test-owner', 'test-repo', 123, 'Engagement Score')

//       expect(result).toBeNull()
//     })

//     it('should handle empty fields', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             fields: {
//               nodes: []
//             }
//           }
//         }
//       })

//       const result = await getProjectField(mockOctokit, 'test-owner', 'test-repo', 123, 'Engagement Score')

//       expect(result).toBeNull()
//     })
//   })

//   describe('updateProjectItem', () => {
//     it('should update project item field value', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         updateProjectV2ItemFieldValue: {
//           projectV2Item: {
//             id: 'item-123'
//           }
//         }
//       })

//       await updateProjectItem(mockOctokit, 'item-123', 'field-456', '50')

//       expect(mockGraphql).toHaveBeenCalledWith(expect.stringContaining('mutation'), {
//         itemId: 'item-123',
//         fieldId: 'field-456',
//         value: '50'
//       })
//     })

//     it('should handle GraphQL errors', async () => {
//       mockGraphql.mockRejectedValueOnce(new Error('GraphQL error'))

//       await expect(updateProjectItem(mockOctokit, 'item-123', 'field-456', '50')).rejects.toThrow('GraphQL error')
//     })

//     it('should handle empty value', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         updateProjectV2ItemFieldValue: {
//           projectV2Item: {
//             id: 'item-123'
//           }
//         }
//       })

//       await updateProjectItem(mockOctokit, 'item-123', 'field-456', '')

//       expect(mockGraphql).toHaveBeenCalledWith(expect.stringContaining('mutation'), {
//         itemId: 'item-123',
//         fieldId: 'field-456',
//         value: ''
//       })
//     })
//   })

//   describe('updateProjectWithScores', () => {
//     it('should update project with engagement scores', async () => {
//       // Mock getProjectField
//       mockGraphql
//         .mockResolvedValueOnce({
//           repository: {
//             projectV2: {
//               id: 'project-123',
//               fields: {
//                 nodes: [
//                   {
//                     id: 'field-456',
//                     name: 'Engagement Score',
//                     dataType: 'TEXT'
//                   }
//                 ]
//               }
//             }
//           }
//         })
//         // Mock updateProjectItem calls
//         .mockResolvedValueOnce({
//           updateProjectV2ItemFieldValue: {
//             projectV2Item: { id: 'project-item-1' }
//           }
//         })
//         .mockResolvedValueOnce({
//           updateProjectV2ItemFieldValue: {
//             projectV2Item: { id: 'project-item-2' }
//           }
//         })

//       await updateProjectWithScores(mockConfig, mockEngagementResponse, mockOctokit)

//       expect(mockGraphql).toHaveBeenCalledTimes(3) // 1 for getProjectField, 2 for updateProjectItem
//       expect(core.info).toHaveBeenCalledWith('Updating project #123 with engagement scores')
//       expect(core.info).toHaveBeenCalledWith('Updated 2 project items with engagement scores')
//     })

//     it('should skip update when applyScores is false', async () => {
//       const configWithoutApply = { ...mockConfig, applyScores: false }

//       await updateProjectWithScores(configWithoutApply, mockEngagementResponse, mockOctokit)

//       expect(mockGraphql).not.toHaveBeenCalled()
//       expect(core.info).toHaveBeenCalledWith('Skipping project update')
//     })

//     it('should skip update when projectNumber is missing', async () => {
//       const configWithoutProject = { ...mockConfig, projectNumber: undefined }

//       await updateProjectWithScores(configWithoutProject, mockEngagementResponse, mockOctokit)

//       expect(mockGraphql).not.toHaveBeenCalled()
//       expect(core.info).toHaveBeenCalledWith('Skipping project update')
//     })

//     it('should warn when project field not found', async () => {
//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             fields: {
//               nodes: []
//             }
//           }
//         }
//       })

//       await updateProjectWithScores(mockConfig, mockEngagementResponse, mockOctokit)

//       expect(core.warning).toHaveBeenCalledWith('Field "Engagement Score" not found in project')
//     })

//     it('should handle items without id gracefully', async () => {
//       const responseWithoutId: EngagementResponse = {
//         items: [
//           {
//             issue: {
//               id: 'issue-1',
//               owner: 'test-owner',
//               repo: 'test-repo',
//               number: 1
//             },
//             engagement: {
//               score: 50,
//               previousScore: 30,
//               classification: EngagementClassification.Hot
//             }
//           }
//         ],
//         totalItems: 1
//       }

//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             fields: {
//               nodes: [
//                 {
//                   id: 'field-456',
//                   name: 'Engagement Score',
//                   dataType: 'TEXT'
//                 }
//               ]
//             }
//           }
//         }
//       })

//       await updateProjectWithScores(mockConfig, responseWithoutId, mockOctokit)

//       expect(core.info).toHaveBeenCalledWith('Updated 0 project items with engagement scores')
//     })

//     it('should handle individual item update failures', async () => {
//       mockGraphql
//         .mockResolvedValueOnce({
//           repository: {
//             projectV2: {
//               id: 'project-123',
//               fields: {
//                 nodes: [
//                   {
//                     id: 'field-456',
//                     name: 'Engagement Score',
//                     dataType: 'TEXT'
//                   }
//                 ]
//               }
//             }
//           }
//         })
//         .mockResolvedValueOnce({
//           updateProjectV2ItemFieldValue: {
//             projectV2Item: { id: 'project-item-1' }
//           }
//         })
//         .mockRejectedValueOnce(new Error('Update failed'))

//       await updateProjectWithScores(mockConfig, mockEngagementResponse, mockOctokit)

//       expect(core.warning).toHaveBeenCalledWith('Failed to update item project-item-2: Error: Update failed')
//       expect(core.info).toHaveBeenCalledWith('Updated 1 project items with engagement scores')
//     })

//     it('should handle empty engagement response', async () => {
//       const emptyResponse: EngagementResponse = {
//         items: [],
//         totalItems: 0
//       }

//       mockGraphql.mockResolvedValueOnce({
//         repository: {
//           projectV2: {
//             id: 'project-123',
//             fields: {
//               nodes: [
//                 {
//                   id: 'field-456',
//                   name: 'Engagement Score',
//                   dataType: 'TEXT'
//                 }
//               ]
//             }
//           }
//         }
//       })

//       await updateProjectWithScores(mockConfig, emptyResponse, mockOctokit)

//       expect(core.info).toHaveBeenCalledWith('Updated 0 project items with engagement scores')
//     })
//   })
// })
