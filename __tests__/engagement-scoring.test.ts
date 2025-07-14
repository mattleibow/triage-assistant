/**
 * Unit tests for engagement scoring functions
 */

import { describe, it, expect } from '@jest/globals'
import { calculateScore, calculatePreviousScore } from '../src/engagement.js'
import type { IssueDetails } from '../src/engagement-types.js'

describe('calculateScore', () => {
  it('should calculate score for brand new issue', () => {
    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'testuser' },
      assignees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [],
      reactions: [],
      commentReactions: []
    }

    const score = calculateScore(issue)

    // Brand new issue should have score of 4:
    // - 0 comments * 3 = 0
    // - 0 reactions * 1 = 0
    // - 1 contributor * 2 = 2
    // - 1/1 day (lastActivity) * 1 = 1
    // - 1/1 day (age) * 1 = 1
    // - 0 linked PRs * 2 = 0
    // Total: 0 + 0 + 2 + 1 + 1 + 0 = 4
    expect(score).toBe(4)
  })

  it('should calculate score for ancient issue', () => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const issue: IssueDetails = {
      id: 124,
      number: 124,
      title: 'Ancient Issue',
      body: 'Ancient body',
      state: 'open',
      user: { login: 'testuser' },
      assignees: [],
      created_at: oneYearAgo.toISOString(),
      updated_at: oneYearAgo.toISOString(),
      comments: [],
      reactions: [],
      commentReactions: []
    }

    const score = calculateScore(issue)

    // Ancient issue should have score of 2:
    // - 0 comments * 3 = 0
    // - 0 reactions * 1 = 0
    // - 1 contributor * 2 = 2
    // - 1/365 days (lastActivity) * 1 = 0 (Math.floor)
    // - 1/365 days (age) * 1 = 0 (Math.floor)
    // - 0 linked PRs * 2 = 0
    // Total: 0 + 0 + 2 + 0 + 0 + 0 = 2
    expect(score).toBe(2)
  })

  it('should calculate brand new issue score higher than ancient issue', () => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const ancientIssue: IssueDetails = {
      id: 124,
      number: 124,
      title: 'Ancient Issue',
      body: 'Ancient body',
      state: 'open',
      user: { login: 'testuser' },
      assignees: [],
      created_at: oneYearAgo.toISOString(),
      updated_at: oneYearAgo.toISOString(),
      comments: [],
      reactions: [],
      commentReactions: []
    }

    const brandNewIssue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Brand New Issue',
      body: 'Brand new body',
      state: 'open',
      user: { login: 'testuser' },
      assignees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [],
      reactions: [],
      commentReactions: []
    }

    const brandNewScore = calculateScore(brandNewIssue)
    const ancientScore = calculateScore(ancientIssue)

    expect(brandNewScore).toBeGreaterThan(ancientScore)
  })

  it('should calculate score with comments, reactions, and contributors', () => {
    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'author' },
      assignees: [{ login: 'assignee1' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [
        {
          id: 1,
          user: { login: 'commenter1' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          user: { login: 'commenter2' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      reactions: [
        { id: 1, user: { login: 'user1' }, created_at: new Date().toISOString() },
        { id: 2, user: { login: 'user2' }, created_at: new Date().toISOString() }
      ],
      commentReactions: [
        { id: 3, user: { login: 'user3' }, created_at: new Date().toISOString() }
      ]
    }

    const score = calculateScore(issue)

    // Expected score:
    // - 2 comments * 3 = 6
    // - 3 reactions (2 + 1) * 1 = 3
    // - 4 contributors (author, assignee1, commenter1, commenter2) * 2 = 8
    // - 1/1 day (lastActivity) * 1 = 1
    // - 1/1 day (age) * 1 = 1
    // - 0 linked PRs * 2 = 0
    // Total: 6 + 3 + 8 + 1 + 1 + 0 = 19
    expect(score).toBe(19)
  })

  it('should handle duplicate contributors correctly', () => {
    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'author' },
      assignees: [{ login: 'assignee1' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [
        {
          id: 1,
          user: { login: 'author' }, // Same as issue author
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          user: { login: 'assignee1' }, // Same as assignee
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      reactions: [],
      commentReactions: []
    }

    const score = calculateScore(issue)

    // Expected score:
    // - 2 comments * 3 = 6
    // - 0 reactions * 1 = 0
    // - 2 unique contributors (author, assignee1) * 2 = 4  // Should not double count
    // - 1/1 day (lastActivity) * 1 = 1
    // - 1/1 day (age) * 1 = 1
    // - 0 linked PRs * 2 = 0
    // Total: 6 + 0 + 4 + 1 + 1 + 0 = 12
    expect(score).toBe(12)
  })

  it('should handle issue with no engagement correctly', () => {
    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'author' },
      assignees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [],
      reactions: [],
      commentReactions: []
    }

    const score = calculateScore(issue)

    // Should still have some score from author and time factors
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(10)
  })
})

describe('calculatePreviousScore', () => {
  it('should return 0 for issue created after cutoff date', () => {
    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'author' },
      assignees: [],
      created_at: new Date().toISOString(), // Created today
      updated_at: new Date().toISOString(),
      comments: [],
      reactions: [],
      commentReactions: []
    }

    const previousScore = calculatePreviousScore(issue)

    // Issue created today, so 7 days ago it didn't exist
    expect(previousScore).toBe(0)
  })

  it('should calculate previous score for issue created before cutoff', () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'author' },
      assignees: [],
      created_at: tenDaysAgo.toISOString(),
      updated_at: new Date().toISOString(),
      comments: [
        {
          id: 1,
          user: { login: 'commenter1' },
          created_at: tenDaysAgo.toISOString(), // Before cutoff
          updated_at: tenDaysAgo.toISOString()
        },
        {
          id: 2,
          user: { login: 'commenter2' },
          created_at: fiveDaysAgo.toISOString(), // After cutoff
          updated_at: fiveDaysAgo.toISOString()
        }
      ],
      reactions: [
        { id: 1, user: { login: 'user1' }, created_at: tenDaysAgo.toISOString() }, // Before cutoff
        { id: 2, user: { login: 'user2' }, created_at: fiveDaysAgo.toISOString() } // After cutoff
      ],
      commentReactions: [
        { id: 3, user: { login: 'user3' }, created_at: tenDaysAgo.toISOString() }, // Before cutoff
        { id: 4, user: { login: 'user4' }, created_at: fiveDaysAgo.toISOString() } // After cutoff
      ]
    }

    const previousScore = calculatePreviousScore(issue)

    // Should calculate score with only activities before 7 days ago
    expect(previousScore).toBeGreaterThan(0)
    expect(previousScore).toBeLessThan(calculateScore(issue)) // Should be less than current score
  })

  it('should filter out newer comments and reactions', () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

    const issue: IssueDetails = {
      id: 123,
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      user: { login: 'author' },
      assignees: [],
      created_at: tenDaysAgo.toISOString(),
      updated_at: new Date().toISOString(),
      comments: [
        {
          id: 1,
          user: { login: 'commenter1' },
          created_at: tenDaysAgo.toISOString(),
          updated_at: tenDaysAgo.toISOString()
        },
        {
          id: 2,
          user: { login: 'commenter2' },
          created_at: fiveDaysAgo.toISOString(),
          updated_at: fiveDaysAgo.toISOString()
        }
      ],
      reactions: [
        { id: 1, user: { login: 'user1' }, created_at: tenDaysAgo.toISOString() },
        { id: 2, user: { login: 'user2' }, created_at: fiveDaysAgo.toISOString() }
      ],
      commentReactions: [
        { id: 3, user: { login: 'user3' }, created_at: tenDaysAgo.toISOString() },
        { id: 4, user: { login: 'user4' }, created_at: fiveDaysAgo.toISOString() }
      ]
    }

    const previousScore = calculatePreviousScore(issue)

    // Previous score should only include:
    // - 1 comment (from 10 days ago) * 3 = 3
    // - 2 reactions (1 issue + 1 comment, both from 10 days ago) * 1 = 2
    // - 2 contributors (author, commenter1) * 2 = 4
    // - Time factors (small positive numbers)
    // Total should be around 9 + time factors
    expect(previousScore).toBeGreaterThan(8)
    expect(previousScore).toBeLessThan(15)
  })
})