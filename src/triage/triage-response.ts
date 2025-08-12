/**
 * Represents structured reproduction information for missing info responses.
 */
export interface ReproInfo {
  has_clear_description: boolean
  has_steps: boolean
  has_code: boolean
  links: string[]
}

/**
 * Represents the complete payload for missing info responses.
 */
export interface MissingInfoPayload {
  summary: string
  repro: ReproInfo
  missing: string[]
  questions: string[]
  labels: Array<{
    label: string
    reason: string
  }>
}

/**
 * Represents the response structure for a triage operation.
 *
 * @property regression - Optional regression information, including:
 *   - `working-version`: The version where the issue was not present.
 *   - `broken-version`: The version where the issue appeared.
 *   - `evidence`: Supporting evidence for the regression.
 * @property labels - An array of label objects, each containing:
 *   - `label`: The name of the label.
 *   - `reason`: The reason why the label was applied.
 * @property remarks - An array of remarks or comments related to the triage.
 * @property summary - Optional summary for missing info responses.
 * @property repro - Optional reproduction information for missing info responses.
 * @property missing - Optional array of missing fields for missing info responses.
 * @property questions - Optional array of questions for missing info responses.
 */
export interface TriageResponse {
  remarks: Array<string>

  regression: {
    'working-version': string
    'broken-version': string
    evidence: string
  } | null

  labels: Array<{
    label: string
    reason: string
  }>

  // Missing info specific fields (optional)
  summary?: string
  repro?: ReproInfo
  missing?: string[]
  questions?: string[]

  // Index signature to allow dynamic property access
  [key: string]: unknown
}
