import { GetProjectItemsQuery } from '../../src/generated/graphql'

export function project8(): GetProjectItemsQuery {
  return {
    repository: {
      projectV2: {
        id: 'PVT_kwHOABC7qM4A-32I',
        title: 'Triage Assistant Project',
        items: {
          pageInfo: {
            hasNextPage: false,
            endCursor: 'Y3Vyc29yOnYyOpKqMDAwMDAwMDAuNc4HP346',
            __typename: 'PageInfo'
          },
          nodes: [
            {
              id: 'PVTI_lAHOABC7qM4A-32Izgc_eaQ',
              content: {
                id: 'I_kwDOOy552s7ComT5',
                number: 32,
                repository: {
                  name: 'triage-assistant',
                  owner: {
                    login: 'mattleibow',
                    __typename: 'User'
                  },
                  __typename: 'Repository'
                },
                __typename: 'Issue'
              },
              __typename: 'ProjectV2Item'
            },
            {
              id: 'PVTI_lAHOABC7qM4A-32Izgc_fjo',
              content: {
                id: 'I_kwDOOy552s7Cos4Q',
                number: 33,
                repository: {
                  name: 'triage-assistant',
                  owner: {
                    login: 'mattleibow',
                    __typename: 'User'
                  },
                  __typename: 'Repository'
                },
                __typename: 'Issue'
              },
              __typename: 'ProjectV2Item'
            }
          ],
          __typename: 'ProjectV2ItemConnection'
        },
        __typename: 'ProjectV2'
      },
      __typename: 'Repository'
    }
  }
}
