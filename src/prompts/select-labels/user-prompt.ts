export const userPrompt = `
A new issue has arrived, please triage and apply
the appropriate labels. The issue is as follows:

The issue number is:
#{{ISSUE_NUMBER}}

The title is:
EXEC: gh api "repos/{{ISSUE_REPO}}/issues/{{ISSUE_NUMBER}}" --cache 10s --jq '.title'

The body is:
EXEC: gh api "repos/{{ISSUE_REPO}}/issues/{{ISSUE_NUMBER}}" --cache 10s --jq '.body'
`
