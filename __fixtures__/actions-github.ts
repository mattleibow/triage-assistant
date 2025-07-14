// import type * as github from '@actions/github'
import { jest } from '@jest/globals'

export const getOctokit = jest.fn()

export const context = {
  repo: {
    owner: 'test-owner',
    repo: 'test-repo'
  },
  issue: {
    number: 123
  }
}
