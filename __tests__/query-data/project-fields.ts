import { GetProjectFieldsQuery, ProjectV2FieldType } from '../../src/generated/graphql'

export function project8Fields(): GetProjectFieldsQuery {
  return {
    repository: {
      projectV2: {
        id: 'PVT_kwHOABC7qM4A-32I',
        fields: {
          nodes: [
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUps',
              name: 'Title',
              dataType: 'TITLE' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUpw',
              name: 'Assignees',
              dataType: 'ASSIGNEES' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTSSF_lAHOABC7qM4A-32IzgyJUp0',
              name: 'Status',
              dataType: 'SINGLE_SELECT' as ProjectV2FieldType,
              __typename: 'ProjectV2SingleSelectField'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUp4',
              name: 'Labels',
              dataType: 'LABELS' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUp8',
              name: 'Linked pull requests',
              dataType: 'LINKED_PULL_REQUESTS' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUqA',
              name: 'Milestone',
              dataType: 'MILESTONE' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUqE',
              name: 'Repository',
              dataType: 'REPOSITORY' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUqI',
              name: 'Reviewers',
              dataType: 'REVIEWERS' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUqM',
              name: 'Parent issue',
              dataType: 'PARENT_ISSUE' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyJUqQ',
              name: 'Sub-issues progress',
              dataType: 'SUB_ISSUES_PROGRESS' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTF_lAHOABC7qM4A-32IzgyVxkI',
              name: 'Engagement Score',
              dataType: 'NUMBER' as ProjectV2FieldType,
              __typename: 'ProjectV2Field'
            },
            {
              id: 'PVTSSF_lAHOABC7qM4A-32IzgyVxoA',
              name: 'Engagement Classification',
              dataType: 'SINGLE_SELECT' as ProjectV2FieldType,
              __typename: 'ProjectV2SingleSelectField'
            }
          ],
          __typename: 'ProjectV2FieldConfigurationConnection'
        },
        __typename: 'ProjectV2'
      },
      __typename: 'Repository'
    }
  }
}
