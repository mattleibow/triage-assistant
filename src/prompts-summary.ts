import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { getPrompt } from './prompts/apply/index.js'
import { generatePrompt } from './prompts.js'
import { runInference } from './ai.js'
import { TriageResponse } from './triage-response.js'
import { InferenceConfig, SummaryPromptConfig, TriageConfig } from './triage-config.js'

/**
 * Generates a summary of the merged response using AI inference.
 *
 * @param config The triage configuration object.
 * @param mergedResponseFile Path to the merged response JSON file.
 * @returns Promise that resolves with the path to the summary response file.
 */
export async function generateSummary(
  config: SummaryPromptConfig & InferenceConfig & TriageConfig,
  mergedResponseFile: string
) {
  const summaryDir = path.join(config.tempDir, 'triage-apply', 'prompts')
  const summaryResponseFile = path.join(config.tempDir, 'triage-apply', 'responses', 'response.md')

  // Ensure directories exist
  await fs.promises.mkdir(summaryDir, { recursive: true })
  await fs.promises.mkdir(path.dirname(summaryResponseFile), { recursive: true })

  // Generate system prompt
  const systemPromptPath = path.join(summaryDir, 'system-prompt.md')
  await generatePromptFile('system', systemPromptPath, config, mergedResponseFile)

  // Generate user prompt
  const userPromptPath = path.join(summaryDir, 'user-prompt.md')
  await generatePromptFile('user', userPromptPath, config, mergedResponseFile)

  // Run AI inference to generate the summary
  const systemPrompt = await fs.promises.readFile(systemPromptPath, 'utf8')
  const userPrompt = await fs.promises.readFile(userPromptPath, 'utf8')
  await runInference(systemPrompt, userPrompt, summaryResponseFile, 500, config)

  return summaryResponseFile
}

/**
 * Merges multiple response JSON files into a single response file.
 *
 * @param inputFiles Comma or newline separated list of input files.
 * @param responseDir The directory with response files.
 * @param outputPath Path to write the merged response file.
 * @returns Promise that resolves with the merged response data.
 */
export async function mergeResponses(
  inputFiles: string | null,
  responseDir: string,
  outputPath: string
): Promise<TriageResponse> {
  const allFiles: string[] = []

  if (inputFiles) {
    // Process comma or newline separated input
    const files = inputFiles
      .split(/[,\n\r]+/)
      .map((f: string) => f.trim())
      .filter((f: string) => f)
      .map((f: string) => path.join(f.trim()))
    allFiles.push(...files)
  } else {
    // Process all JSON files from responses directory
    try {
      const files = await fs.promises.readdir(path.join(responseDir))
      const jsonFilePaths = files
        .filter((f: string) => f.endsWith('.json')) // get json files
        .map((f: string) => path.join(responseDir, f)) // construct full paths
      allFiles.push(...jsonFilePaths)
    } catch {
      // The directory may not exist, so we ignore the error
    }
  }

  if (allFiles.length === 0) {
    throw new Error('No input files specified for merging responses')
  }

  core.info(`Merging files: ${allFiles.join(', ')}`)

  const merged: TriageResponse = {
    remarks: [],
    regression: null,
    labels: []
  }
  for (const file of allFiles) {
    try {
      core.info(`Processing file: ${file}`)

      // Read and parse the JSON file
      const fileContents = await getFileContents(file)
      const json = JSON.parse(fileContents) as TriageResponse

      // Merge the JSON data
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
    } catch {
      core.warning(`Failed to read or parse file: ${file}`)
    }
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.promises.writeFile(outputPath, JSON.stringify(merged, null, 2))

  core.info(`Merged response written to: ${outputPath}`)

  return merged
}

/**
 * Generates a prompt file based on the provided template and configuration.
 *
 * @param template The template prompt to use.
 * @param promptPath The path to write the generated prompt file.
 * @param config The configuration object containing template and replacements.
 * @param mergedResponseFile Path to the merged response JSON file.
 */
async function generatePromptFile(
  template: string,
  promptPath: string,
  config: SummaryPromptConfig,
  mergedResponseFile: string
) {
  await generatePrompt(
    getPrompt(template),
    promptPath,
    {
      ISSUE_NUMBER: config.issueNumber.toString(),
      ISSUE_REPO: config.repository,
      MERGED_JSON: mergedResponseFile
    },
    config
  )
}

/**
 * Helper function to read file contents and remove wrapping code blocks if present.
 *
 * @param file Path to the file to read.
 * @returns Promise that resolves with the file contents.
 */
async function getFileContents(file: string) {
  let fileContents = await fs.promises.readFile(file, 'utf8')

  // Break file contents into lines
  const lines = fileContents.split('\n')

  // Remove wrapping code blocks if present
  if (lines[0]?.match(/^\s*```/)) {
    lines.shift()
  }
  if (lines[lines.length - 1]?.match(/^\s*```/)) {
    lines.pop()
  }

  // Combine lines back into a single string
  fileContents = lines.join('\n')

  return fileContents
}
