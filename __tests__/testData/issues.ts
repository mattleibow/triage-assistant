import { GetIssueDetailsQuery, IssueState, ReactionContent } from '../../src/generated/graphql'

export const issue32: GetIssueDetailsQuery = {
  repository: {
    owner: {
      login: 'mattleibow',
      __typename: 'User'
    },
    name: 'triage-assistant',
    nameWithOwner: 'mattleibow/triage-assistant',
    issue: {
      id: 'I_kwDOOy552s7ComT5',
      number: 32,
      title: 'An issue for the unit tests',
      body: '## Description\n\nThis is an issue for the unit tests and not a real one.\n\nWe need some real data to allow for real tests.',
      state: 'OPEN' as IssueState,
      createdAt: '2025-07-26T10:36:49Z',
      updatedAt: '2025-07-26T10:38:08Z',
      closedAt: null,
      author: {
        login: 'mattleibow',
        __typename: 'User'
      },
      assignees: {
        nodes: [
          {
            login: 'mattleibow',
            __typename: 'User'
          },
          {
            login: 'Copilot',
            __typename: 'User'
          }
        ]
      },
      reactions: {
        totalCount: 3,
        pageInfo: {
          hasNextPage: false,
          endCursor: 'Y3Vyc29yOnYyOpHODIrKEA=='
        },
        nodes: [
          {
            content: 'ROCKET' as ReactionContent,
            createdAt: '2025-07-26T10:37:24Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'THUMBS_UP' as ReactionContent,
            createdAt: '2025-07-26T10:37:26Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'EYES' as ReactionContent,
            createdAt: '2025-07-27T19:12:56Z',
            user: {
              login: 'Copilot',
              __typename: 'User'
            }
          }
        ]
      },
      comments: {
        totalCount: 1,
        pageInfo: {
          hasNextPage: false,
          endCursor: 'Y3Vyc29yOnYyOpHOug_mMg=='
        },
        nodes: [
          {
            createdAt: '2025-07-26T10:38:07Z',
            author: {
              login: 'github-actions',
              __typename: 'Bot'
            },
            reactions: {
              totalCount: 0,
              pageInfo: {
                hasNextPage: false,
                endCursor: null
              },
              nodes: []
            }
          }
        ]
      }
    }
  }
}

export const issue33: GetIssueDetailsQuery = {
  repository: {
    owner: {
      login: 'mattleibow',
      __typename: 'User'
    },
    name: 'triage-assistant',
    nameWithOwner: 'mattleibow/triage-assistant',
    issue: {
      id: 'I_kwDOOy552s7Cos4Q',
      number: 33,
      title: 'An second issue for the unit tests',
      body: '## Description\n\nThis is another issue for the unit tests and not a real one.\n\nWe need some real data to allow for real tests.\n\nThis one has some more context though. We are wanting to relate this issue with the AI and prompt system.',
      state: 'OPEN' as IssueState,
      createdAt: '2025-07-26T11:14:12Z',
      updatedAt: '2025-07-26T11:14:39Z',
      closedAt: null,
      author: {
        login: 'mattleibow',
        __typename: 'User'
      },
      assignees: {
        nodes: [
          {
            login: 'mattleibow',
            __typename: 'User'
          }
        ]
      },
      reactions: {
        totalCount: 8,
        pageInfo: {
          hasNextPage: false,
          endCursor: 'Y3Vyc29yOnYyOpHODInfxA=='
        },
        nodes: [
          {
            content: 'THUMBS_UP' as ReactionContent,
            createdAt: '2025-07-26T12:05:27Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'HOORAY' as ReactionContent,
            createdAt: '2025-07-26T12:05:28Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'ROCKET' as ReactionContent,
            createdAt: '2025-07-26T12:05:30Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'EYES' as ReactionContent,
            createdAt: '2025-07-26T12:05:31Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'CONFUSED' as ReactionContent,
            createdAt: '2025-07-26T12:05:33Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'HEART' as ReactionContent,
            createdAt: '2025-07-26T12:05:34Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'LAUGH' as ReactionContent,
            createdAt: '2025-07-26T12:05:36Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          },
          {
            content: 'THUMBS_DOWN' as ReactionContent,
            createdAt: '2025-07-26T12:05:38Z',
            user: {
              login: 'mattleibow',
              __typename: 'User'
            }
          }
        ]
      },
      comments: {
        totalCount: 1,
        pageInfo: {
          hasNextPage: false,
          endCursor: 'Y3Vyc29yOnYyOpHOuhBdTA=='
        },
        nodes: [
          {
            createdAt: '2025-07-26T11:14:38Z',
            author: {
              login: 'github-actions',
              __typename: 'User'
            },
            reactions: {
              totalCount: 1,
              pageInfo: {
                hasNextPage: false,
                endCursor: 'Y3Vyc29yOnYyOpHOEcBQdw=='
              },
              nodes: [
                {
                  content: 'LAUGH' as ReactionContent,
                  createdAt: '2025-07-26T12:05:24Z',
                  user: {
                    login: 'mattleibow',
                    __typename: 'User'
                  }
                }
              ]
            }
          }
        ]
      }
    }
  }
}
