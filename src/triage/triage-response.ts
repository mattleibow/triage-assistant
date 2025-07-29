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

  // Index signature to allow dynamic property access
  [key: string]: unknown
}
