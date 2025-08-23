/**
 * Mock fixture for select-labels functions (src/prompts/select-labels.ts)
 */
import type * as selectLabelsModule from '../../src/prompts/select-labels.js'
import { jest } from '@jest/globals'

export const selectLabels = jest.fn<typeof selectLabelsModule.selectLabels>()
