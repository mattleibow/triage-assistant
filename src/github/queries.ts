import { gql } from 'graphql-tag'

export const GET_ISSUE_DETAILS = gql`
  query GetIssueDetails(
    $owner: String!
    $repo: String!
    $issueNumber: Int!
    $commentsCursor: String
    $reactionsCursor: String
  ) {
    repository(owner: $owner, name: $repo) {
      issue(number: $issueNumber) {
        id
        number
        title
        body
        state
        createdAt
        updatedAt
        closedAt
        author {
          login
          ... on User {
            id
          }
        }
        assignees(first: 100) {
          nodes {
            login
            id
          }
        }
        reactions(first: 100, after: $reactionsCursor) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            content
            createdAt
            user {
              login
              id
            }
          }
        }
        comments(first: 100, after: $commentsCursor) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            createdAt
            author {
              login
              ... on User {
                id
              }
            }
            reactions(first: 100) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                content
                createdAt
                user {
                  login
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`
