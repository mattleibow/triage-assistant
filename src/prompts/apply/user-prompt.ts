export const userPrompt = `
Please summarize the results of this triage.

The following labels will be applied for the specified reasons:

EXEC: jq -r '"| Label | Reason |", "|:-|:-|", (.labels[] | "| \\(.label) | \\(.reason) |")' {{MERGED_JSON}}

The following remarks were made:

EXEC: jq -r '.remarks[] | "- " + .' {{MERGED_JSON}}
`
