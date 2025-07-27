/**
 * Real GitHub issue test data fixtures
 * These represent realistic GitHub issues that the triage assistant might encounter
 */

export interface GitHubIssue {
  number: number
  title: string
  body: string
  labels: Array<{ name: string; description?: string }>
  state: 'open' | 'closed'
  user: {
    login: string
    type: 'User' | 'Bot'
  }
  created_at: string
  updated_at: string
  url: string
}

export interface GitHubLabel {
  name: string
  description: string
  color: string
}

/**
 * Sample GitHub labels that might be used in a repository
 */
export const sampleLabels: GitHubLabel[] = [
  { name: 'bug', description: 'Something isn\'t working', color: 'd73a4a' },
  { name: 'enhancement', description: 'New feature or request', color: 'a2eeef' },
  { name: 'documentation', description: 'Improvements or additions to documentation', color: '0075ca' },
  { name: 'question', description: 'Further information is requested', color: 'd876e3' },
  { name: 'wontfix', description: 'This will not be worked on', color: 'ffffff' },
  { name: 'duplicate', description: 'This issue or pull request already exists', color: 'cfd3d7' },
  { name: 'good first issue', description: 'Good for newcomers', color: '7057ff' },
  { name: 'help wanted', description: 'Extra attention is needed', color: '008672' },
  { name: 'invalid', description: 'This doesn\'t seem right', color: 'e4e669' },
  { name: 'type/bug', description: 'Bug report', color: 'd73a4a' },
  { name: 'type/feature', description: 'Feature request', color: 'a2eeef' },
  { name: 'type/docs', description: 'Documentation related', color: '0075ca' },
  { name: 'priority/high', description: 'High priority issue', color: 'b60205' },
  { name: 'priority/medium', description: 'Medium priority issue', color: 'fbca04' },
  { name: 'priority/low', description: 'Low priority issue', color: '0e8a16' },
  { name: 'area/ui', description: 'User interface related', color: 'c2e0c6' },
  { name: 'area/api', description: 'API related', color: 'c2e0c6' },
  { name: 'area/core', description: 'Core functionality', color: 'c2e0c6' },
  { name: 'needs-triage', description: 'Issue needs triaging', color: 'ededed' },
  { name: 'needs-reproduction', description: 'Issue needs a minimal reproduction case', color: 'fef2c0' }
]

/**
 * Sample of realistic GitHub issues that would need triage
 */
export const realGitHubIssues: GitHubIssue[] = [
  {
    number: 1234,
    title: 'Application crashes when clicking save button',
    body: `## Description
I'm experiencing a crash every time I click the save button in the application. The crash happens consistently and makes the app unusable.

## Steps to Reproduce
1. Open the application
2. Navigate to the editor
3. Make some changes to a document
4. Click the "Save" button
5. Application crashes immediately

## Expected Behavior
The document should be saved successfully without any crashes.

## Actual Behavior
The application terminates unexpectedly with no error message.

## Environment
- OS: Windows 11
- App Version: 2.1.3
- Browser: Chrome 118.0.5993.88

## Additional Context
This started happening after the latest update. The issue occurs with both new and existing documents.

## Error Logs
\`\`\`
System.NullReferenceException: Object reference not set to an instance of an object.
   at MyApp.SaveManager.Save(Document doc) line 42
   at MyApp.UI.SaveButton_Click(Object sender, EventArgs e) line 15
\`\`\``,
    labels: [],
    state: 'open',
    user: { login: 'user123', type: 'User' },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    url: 'https://github.com/example/repo/issues/1234'
  },
  {
    number: 1235,
    title: 'Add dark mode support',
    body: `## Feature Request

It would be great to have a dark mode option for the application. Many users prefer dark themes, especially when working in low-light environments.

## Proposed Solution
- Add a toggle in the settings menu
- Implement dark color scheme for all UI elements
- Remember user preference across sessions

## Benefits
- Better user experience in low-light conditions
- Reduced eye strain
- Modern application appearance
- Accessibility improvement

## Additional Notes
This has been requested by multiple users in our community forum.`,
    labels: [],
    state: 'open',
    user: { login: 'poweruser', type: 'User' },
    created_at: '2024-01-16T14:22:00Z',
    updated_at: '2024-01-16T14:22:00Z',
    url: 'https://github.com/example/repo/issues/1235'
  },
  {
    number: 1236,
    title: 'API documentation is incomplete',
    body: `The API documentation is missing several important endpoints and examples.

## Missing Documentation

### Endpoints
- \`POST /api/users\` - User creation
- \`PUT /api/users/{id}\` - User updates  
- \`DELETE /api/users/{id}\` - User deletion

### Missing Information
- Request/response examples
- Error codes and messages
- Authentication requirements
- Rate limiting information

## Impact
Developers are having difficulty integrating with our API due to incomplete documentation.

## Suggestion
Please add comprehensive documentation for all endpoints with examples.`,
    labels: [],
    state: 'open',
    user: { login: 'developer_jane', type: 'User' },
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T09:15:00Z',
    url: 'https://github.com/example/repo/issues/1236'
  },
  {
    number: 1237,
    title: 'How to configure SSL certificates?',
    body: `I'm trying to set up SSL certificates for the application but can't find clear instructions.

## What I've Tried
- Checked the documentation
- Searched through GitHub issues
- Looked at configuration examples

## Questions
1. Where should I place the certificate files?
2. What format should they be in?
3. How do I configure the application to use them?

## Environment
- Docker deployment
- nginx reverse proxy
- Let's Encrypt certificates

Any help would be appreciated!`,
    labels: [],
    state: 'open',
    user: { login: 'sysadmin_bob', type: 'User' },
    created_at: '2024-01-18T16:45:00Z',
    updated_at: '2024-01-18T16:45:00Z',
    url: 'https://github.com/example/repo/issues/1237'
  },
  {
    number: 1238,
    title: 'Performance regression after v2.1.0 update',
    body: `## Issue Description
After upgrading from v2.0.5 to v2.1.0, the application performance has significantly degraded.

## Performance Issues
- Page load times increased from ~200ms to ~2000ms
- Memory usage doubled
- CPU usage consistently high

## Testing Details
### Version 2.0.5 (Working)
- Page load: 180-220ms
- Memory: ~50MB
- CPU: 5-10%

### Version 2.1.0 (Broken)  
- Page load: 1800-2200ms
- Memory: ~100MB
- CPU: 25-40%

## Environment
- Production server
- 1000+ concurrent users
- Load balancer configuration unchanged

## Reproduction Steps
1. Deploy version 2.1.0
2. Monitor application performance
3. Compare with v2.0.5 metrics

This is affecting our production environment and user experience.`,
    labels: [],
    state: 'open',
    user: { login: 'ops_team', type: 'User' },
    created_at: '2024-01-19T11:20:00Z',
    updated_at: '2024-01-19T11:20:00Z',
    url: 'https://github.com/example/repo/issues/1238'
  },
  {
    number: 1239,
    title: 'Security vulnerability in authentication module',
    body: `## Security Issue

⚠️ **SECURITY SENSITIVE** - Please handle with care

I've identified a potential security vulnerability in the authentication module that could allow unauthorized access.

## Issue Details
- Authentication bypass possible under certain conditions
- Affects user session management
- Could lead to privilege escalation

## Impact
- High severity
- Affects all versions since 1.5.0
- Potential data exposure

## Recommendation
- Immediate security patch needed
- Consider security advisory
- Review authentication flow

**Note**: I've sent additional details privately to the security team.`,
    labels: [],
    state: 'open',
    user: { login: 'security_researcher', type: 'User' },
    created_at: '2024-01-20T08:10:00Z',
    updated_at: '2024-01-20T08:10:00Z',
    url: 'https://github.com/example/repo/issues/1239'
  },
  {
    number: 1240,
    title: 'Unit tests failing on CI after dependency update',
    body: `## Issue
The continuous integration pipeline is failing due to unit test failures after updating dependencies.

## Failing Tests
\`\`\`
FAIL src/utils/helpers.test.ts
● Helper function tests › should format dates correctly
  expect(received).toBe(expected)
  Expected: "2024-01-15"
  Received: "15/01/2024"

FAIL src/api/client.test.ts  
● API Client tests › should handle timeout correctly
  Timeout - Async callback was not invoked within the 5000ms timeout
\`\`\`

## Dependencies Updated
- jest: 29.0.0 → 29.7.0
- typescript: 4.9.0 → 5.3.0
- node-fetch: 2.6.7 → 3.3.2

## CI Environment
- Node.js 18.x
- Ubuntu latest
- GitHub Actions

## Local Testing
Tests pass locally on developer machines but fail in CI.`,
    labels: [],
    state: 'open',
    user: { login: 'ci_bot', type: 'Bot' },
    created_at: '2024-01-21T13:30:00Z',
    updated_at: '2024-01-21T13:30:00Z',
    url: 'https://github.com/example/repo/issues/1240'
  }
]

/**
 * Expected triage results for the sample issues above
 * This represents what a good AI triage system should classify
 */
export const expectedTriageResults = {
  1234: {
    labels: [{ label: 'type/bug', reason: 'Clear bug report with steps to reproduce, error logs, and crash description' }],
    priority: 'high'
  },
  1235: {
    labels: [{ label: 'type/feature', reason: 'Feature request for dark mode with clear benefits and user demand' }],
    priority: 'medium'
  },
  1236: {
    labels: [{ label: 'type/docs', reason: 'Documentation improvement request for API endpoints' }],
    priority: 'medium'
  },
  1237: {
    labels: [{ label: 'question', reason: 'User asking for help with SSL configuration setup' }],
    priority: 'low'
  },
  1238: {
    labels: [{ label: 'type/bug', reason: 'Performance regression with specific version comparison data' }],
    priority: 'high',
    regression: {
      'working-version': '2.0.5',
      'broken-version': '2.1.0',
      evidence: 'Performance metrics show 10x increase in load times and 2x memory usage'
    }
  },
  1239: {
    labels: [{ label: 'type/bug', reason: 'Security vulnerability requiring immediate attention' }],
    priority: 'high'
  },
  1240: {
    labels: [{ label: 'type/bug', reason: 'CI test failures after dependency updates indicating breaking changes' }],
    priority: 'medium'
  }
}