import { GetIssueDetailsQuery, IssueState, ReactionContent } from '../../src/generated/graphql'

export function issue32(): GetIssueDetailsQuery {
  return {
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
          ],
          __typename: 'UserConnection'
        },
        reactions: {
          totalCount: 3,
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Y3Vyc29yOnYyOpHODIrKEA==',
            __typename: 'PageInfo'
          },
          nodes: [
            {
              content: 'ROCKET' as ReactionContent,
              createdAt: '2025-07-26T10:37:24Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'THUMBS_UP' as ReactionContent,
              createdAt: '2025-07-26T10:37:26Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'EYES' as ReactionContent,
              createdAt: '2025-07-27T19:12:56Z',
              user: {
                login: 'Copilot',
                __typename: 'User'
              },
              __typename: 'Reaction'
            }
          ],
          __typename: 'ReactionConnection'
        },
        comments: {
          totalCount: 1,
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Y3Vyc29yOnYyOpHOug_mMg==',
            __typename: 'PageInfo'
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
                  endCursor: null,
                  __typename: 'PageInfo'
                },
                nodes: [],
                __typename: 'ReactionConnection'
              },
              __typename: 'IssueComment'
            }
          ],
          __typename: 'IssueCommentConnection'
        },
        __typename: 'Issue'
      },
      __typename: 'Repository'
    }
  }
}

export function issue33(): GetIssueDetailsQuery {
  return {
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
          ],
          __typename: 'UserConnection'
        },
        reactions: {
          totalCount: 8,
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Y3Vyc29yOnYyOpHODInfxA==',
            __typename: 'PageInfo'
          },
          nodes: [
            {
              content: 'THUMBS_UP' as ReactionContent,
              createdAt: '2025-07-26T12:05:27Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'HOORAY' as ReactionContent,
              createdAt: '2025-07-26T12:05:28Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'ROCKET' as ReactionContent,
              createdAt: '2025-07-26T12:05:30Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'EYES' as ReactionContent,
              createdAt: '2025-07-26T12:05:31Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'CONFUSED' as ReactionContent,
              createdAt: '2025-07-26T12:05:33Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'HEART' as ReactionContent,
              createdAt: '2025-07-26T12:05:34Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'LAUGH' as ReactionContent,
              createdAt: '2025-07-26T12:05:36Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            },
            {
              content: 'THUMBS_DOWN' as ReactionContent,
              createdAt: '2025-07-26T12:05:38Z',
              user: {
                login: 'mattleibow',
                __typename: 'User'
              },
              __typename: 'Reaction'
            }
          ],
          __typename: 'ReactionConnection'
        },
        comments: {
          totalCount: 1,
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Y3Vyc29yOnYyOpHOuhBdTA==',
            __typename: 'PageInfo'
          },
          nodes: [
            {
              createdAt: '2025-07-26T11:14:38Z',
              author: {
                login: 'github-actions',
                __typename: 'Bot'
              },
              reactions: {
                totalCount: 1,
                pageInfo: {
                  hasNextPage: false,
                  endCursor: 'Y3Vyc29yOnYyOpHOEcBQdw==',
                  __typename: 'PageInfo'
                },
                nodes: [
                  {
                    content: 'LAUGH' as ReactionContent,
                    createdAt: '2025-07-26T12:05:24Z',
                    user: {
                      login: 'mattleibow',
                      __typename: 'User'
                    },
                    __typename: 'Reaction'
                  }
                ],
                __typename: 'ReactionConnection'
              },
              __typename: 'IssueComment'
            }
          ],
          __typename: 'IssueCommentConnection'
        },
        __typename: 'Issue'
      },
      __typename: 'Repository'
    }
  }
}
