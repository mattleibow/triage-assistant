/**
 * Mock fixture for config file functions (src/config-file.ts)
 */
import type * as config from '../src/config-file.js'
import { jest } from '@jest/globals'

export const loadConfigFile = jest.fn<typeof config.loadConfigFile>()
export const loadFile = jest.fn<typeof config.loadFile>()
export const parseConfigFile = jest.fn<typeof config.parseConfigFile>()
