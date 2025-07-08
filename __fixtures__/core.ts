import type * as core from '@actions/core'
import { jest } from '@jest/globals'

export const debug = jest.fn<typeof core.debug>((message: string) => {
  console.debug(`[DEBUG] ${message}`)
})

export const error = jest.fn<typeof core.error>((message: string | Error) => {
  console.error(`[ERROR] ${message}`)
})

export const info = jest.fn<typeof core.info>((message: string) => {
  console.info(`[INFO] ${message}`)
})

export const getInput = jest.fn<typeof core.getInput>()
export const setOutput = jest.fn<typeof core.setOutput>()
export const setFailed = jest.fn<typeof core.setFailed>()

export const warning = jest.fn<typeof core.warning>((message: string | Error) => {
  console.warn(`[WARNING] ${message}`)
})
