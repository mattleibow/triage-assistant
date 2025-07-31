import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { TriageResponse } from './triage-response.js'

/**
 * Merges multiple response JSON files into a single response file.
 *
 * @param inputFiles Comma or newline separated list of input files.
 * @param responsesDir The directory with response files.
 * @param outputPath Path to write the merged response file.
 * @returns Promise that resolves with the merged response data.
 */
export async function mergeResponses(
  inputFiles: string | null,
  responsesDir: string,
  outputPath: string
): Promise<TriageResponse> {
  const allFiles: string[] = []

  if (inputFiles) {
    // Process comma or newline separated input
    const files = inputFiles
      .split(/[,\n\r]+/)
      .map((f: string) => f.trim())
      .filter((f: string) => f)
      .map((f: string) => {
        // Validate file extension for security
        if (!f.trim().endsWith('.json')) {
          throw new Error(`Invalid file type: ${f}. Only JSON files are allowed.`)
        }
        return path.join(f.trim())
      })
    allFiles.push(...files)
  } else {
    // Process all JSON files from responses directory
    try {
      const files = await fs.promises.readdir(responsesDir)
      const jsonFilePaths = files
        .filter((f: string) => f.endsWith('.json')) // get json files
        .filter((f: string) => /^[a-zA-Z0-9._-]+\.json$/.test(f)) // validate filename format
        .map((f: string) => path.join(responsesDir, f)) // construct full paths
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
 * Helper function to read file contents and remove wrapping code blocks if present.
 *
 * @param file Path to the file to read.
 * @returns Promise that resolves with the file contents.
 */
async function getFileContents(file: string) {
  // Optional file size check - skip if stat fails (e.g., in test environment)
  try {
    const stats = await fs.promises.stat(file)
    const maxFileSize = 10 * 1024 * 1024 // 10MB limit
    if (stats.size > maxFileSize) {
      throw new Error(`File ${file} is too large (${stats.size} bytes). Maximum allowed size is ${maxFileSize} bytes.`)
    }
  } catch (error) {
    // If stat fails, continue anyway (might be in test environment)
    if (error instanceof Error && error.message.includes('too large')) {
      throw error // Re-throw size errors
    }
    // Ignore other stat errors (e.g., file not found, which will be caught by readFile)
  }

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
