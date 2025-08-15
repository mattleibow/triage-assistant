/**
 * Mock fixture for summary functions (src/engagement/engagement.ts)
 */
import type * as engagement from '../../src/engagement/engagement.js'
import { jest } from '@jest/globals'

export const runEngagementWorkflow = jest.fn<typeof engagement.runEngagementWorkflow>()
export const calculateEngagementScores = jest.fn<typeof engagement.calculateEngagementScores>()
export const createEngagementItem = jest.fn<typeof engagement.createEngagementItem>()
