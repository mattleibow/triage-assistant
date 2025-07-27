import { jest } from '@jest/globals'
import * as github from '@actions/github'
import {
  getAllProjectItems
} from '../src/github/projects.js'

// Mock GitHub API
const mockGraphql = jest.fn() as jest.MockedFunction<any>
const mockOctokit = {
  graphql: mockGraphql
} as unknown as ReturnType<typeof github.getOctokit>

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

    it('should handle single page results', async () => {
      mockGraphql.mockResolvedValueOnce({
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

      const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

      expect(result).toHaveLength(1)
      expect(mockGraphql).toHaveBeenCalledTimes(1)
    })

    it('should handle empty project', async () => {
      mockGraphql.mockResolvedValueOnce({
        repository: {
          projectV2: {
            id: 'project-123',
            items: {
              pageInfo: {
                hasNextPage: false,
                endCursor: null
              },
              nodes: []
            }
          }
        }
      })

      const result = await getAllProjectItems(mockOctokit, 'test-owner', 'test-repo', 123)

      expect(result).toEqual([])
    })
  })
})