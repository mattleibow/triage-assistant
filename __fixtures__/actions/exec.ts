import type * as execReal from '@actions/exec'
import { jest } from '@jest/globals'

export const exec = jest.fn<typeof execReal.exec>()
