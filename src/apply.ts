import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import { getPrompt } from './prompts/apply/index.js'
import { runInference, generatePrompt } from './ai.js'
import { commentOnIssue, applyLabelsToIssue } from './github.js'
import { TriageConfig } from './triage-config.js'
import { TriageResponse } from './triage-response.js'

/**
 * Applies labels and comments to an issue based on merged response data.
 *
 * @param inputFiles Comma or newline separated list of input files.
 * @param config The triage configuration object.
 */
export async function applyLabelsAndComment(
  inputFiles: string,
  config: TriageConfig
): Promise<void> {
  const octokit = github.getOctokit(config.token)

  // Merge response JSON files
  const mergedResponseFile = path.join(
    config.tempDir,
    'triage-assistant',
    'responses.json'
  )
  const responseDir = path.join(config.tempDir, 'triage-assistant', 'responses')
  const mergedResponse = await mergeResponses(
    inputFiles,
    mergedResponseFile,
    responseDir
  )

  if (config.applyComment) {
    // Generate summary using AI
    const summaryDir = path.join(config.tempDir, 'triage-apply', 'prompts')
    await fs.promises.mkdir(summaryDir, { recursive: true })

    const systemPromptPath = path.join(summaryDir, 'system-prompt.md')
    await generatePrompt(
      getPrompt('system'),
      systemPromptPath,
      {
        ISSUE_NUMBER: config.issueNumber.toString(),
        ISSUE_REPO: config.repository,
        MERGED_JSON: mergedResponseFile
      },
      config
    )

    const userPromptPath = path.join(summaryDir, 'user-prompt.md')
    await generatePrompt(
      getPrompt('user'),
      userPromptPath,
      {
        ISSUE_NUMBER: config.issueNumber.toString(),
        ISSUE_REPO: config.repository,
        MERGED_JSON: mergedResponseFile
      },
      config
    )

    const summaryResponseFile = path.join(
      config.tempDir,
      'triage-apply',
      'responses',
      'response.md'
    )
    await fs.promises.mkdir(path.dirname(summaryResponseFile), {
      recursive: true
    })
    await runInference(
      systemPromptPath,
      userPromptPath,
      summaryResponseFile,
      500,
      config
    )

    // Comment on the issue
    await commentOnIssue(summaryResponseFile, config, octokit)
  }

  if (config.applyLabels) {
    // Apply labels to the issue
    await applyLabelsToIssue(mergedResponse, config, octokit)
  }
}

/**
 * Merges multiple response JSON files into a single response file.
 *
 * @param inputFiles Comma or newline separated list of input files.
 * @param outputPath Path to write the merged response file.
 * @param responseDir The directory with response files.
 * @returns Promise that resolves with the merged response data.
 */
async function mergeResponses(
  inputFiles: string | null,
  outputPath: string,
  responseDir: string
): Promise<TriageResponse> {
  const allFiles: string[] = []

  if (inputFiles) {
    // Process comma or newline separated input
    allFiles.push(
      ...inputFiles
        .split(/[,\n\r]+/)
        .map((f: string) => f.trim())
        .filter((f: string) => f)
    )
  } else {
    // Process all JSON files from responses directory
    if (fs.existsSync(responseDir)) {
      const files = await fs.promises.readdir(responseDir)
      allFiles.push(
        ...files
          .filter((f: string) => f.endsWith('.json'))
          .map((f: string) => path.join(responseDir, f))
      )
    }
  }

  if (allFiles.length === 0) {
    throw new Error('No input files specified for merging responses')
  }

  core.info(`Merging files: ${allFiles.join(', ')}`)

  const merged: any = {}
  for (const file of allFiles) {
    if (fs.existsSync(file)) {
      core.info(`Processing file: ${file}`)
      let fileContents = await fs.promises.readFile(file, 'utf8')

      // Remove wrapping code blocks if present
      const lines = fileContents
        .split('\n')
        .filter((line: string) => line.trim() !== '')
      if (lines[0]?.match(/^\s*```/)) {
        lines.shift()
      }
      if (lines[lines.length - 1]?.match(/^\s*```/)) {
        lines.pop()
      }
      fileContents = lines.join('\n')

      const json = JSON.parse(fileContents)
      for (const [key, value] of Object.entries(json)) {
        if (merged[key]) {
          if (Array.isArray(merged[key]) && Array.isArray(value)) {
            merged[key].push(...value)
          } else {
            merged[key] = value
          }
        } else {
          merged[key] = value
        }
      }
    }
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.promises.writeFile(outputPath, JSON.stringify(merged, null, 2))

  return merged as TriageResponse
}
