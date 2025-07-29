# AI Triage Assistant

[![GitHub Super-Linter](https://github.com/mattleibow/triage-assistant/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mattleibow/triage-assistant/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mattleibow/triage-assistant/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/mattleibow/triage-assistant/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An AI-powered GitHub Action that automatically triages issues and pull requests by analyzing their content and applying
appropriate labels using large language models.

## Usage

### Basic Triage Workflow

Create a workflow file (e.g., `.github/workflows/triage.yml`) to automatically triage new issues and pull requests:

```yaml
name: 'Triage Issues and Pull Requests'

on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

permissions:
  contents: read
  issues: write
  pull-requests: write
  models: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Determine area label
        uses: mattleibow/triage-assistant@v0
        with:
          label-prefix: 'area-'
          template: 'single-label'
          apply-labels: true
```

### Advanced Multi-Step Triage

For more sophisticated triage workflows, you can use multiple steps with different templates:

```yaml
steps:
  - name: Determine overlap labels
    uses: mattleibow/triage-assistant@v0
    with:
      label-prefix: 'overlap-'
      template: 'multi-label'

  - name: Determine area label
    uses: mattleibow/triage-assistant@v0
    with:
      label-prefix: 'area-'
      template: 'single-label'

  - name: Check for regression
    uses: mattleibow/triage-assistant@v0
    with:
      label: 'regression'
      template: 'regression'

  - name: Apply all labels and add comment
    uses: mattleibow/triage-assistant@v0
    with:
      apply-labels: true
      apply-comment: true
```

### Manual Triage

You can also trigger triage manually using workflow dispatch:

```yaml
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to triage'
        required: true
        type: number

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Triage specific issue
        uses: mattleibow/triage-assistant@v0
        with:
          issue: ${{ inputs.issue_number }}
          template: 'single-label'
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true
```

## Inputs

### Triage Inputs

| Name             | Description                                                                                      | Default                 | Required |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | -------- |
| `issue`          | The issue number to triage                                                                       | Current issue/PR number | No       |
| `token`          | GitHub token for API access                                                                      | `${{ github.token }}`   | No       |
| `template`       | Triage template: `multi-label`, `single-label`, `regression`, `missing-info`, `engagement-score` | `''`                    | No       |
| `label`          | Specific label to evaluate                                                                       | `''`                    | No       |
| `label-prefix`   | Prefix for label search (e.g., `area-`, `platform/`)                                             | `''`                    | No       |
| `apply-labels`   | Whether to apply labels to the issue                                                             | `false`                 | No       |
| `apply-comment`  | Whether to add a comment with AI analysis                                                        | `false`                 | No       |
| `comment-footer` | Footer text for AI comments                                                                      | Default disclaimer      | No       |

### Engagement Scoring Inputs

| Name             | Description                                         | Default            | Required |
| ---------------- | --------------------------------------------------- | ------------------ | -------- |
| `project`        | GitHub Project number for engagement scoring        | `''`               | No       |
| `project-column` | Project field name to update with engagement scores | `Engagement Score` | No       |
| `apply-scores`   | Whether to apply engagement scores to project items | `false`            | No       |

### General Inputs

| Name          | Description                                | Default                | Required |
| ------------- | ------------------------------------------ | ---------------------- | -------- |
| `dry-run`     | Run in dry-run mode without making changes | `false`                | No       |
| `ai-token`    | Custom AI token for inference              | Uses GitHub token      | No       |
| `ai-endpoint` | Custom AI endpoint URL                     | GitHub Models endpoint | No       |
| `ai-model`    | AI model to use for inference              | `openai/gpt-4o`        | No       |

## Outputs

| Name            | Description                                        |
| --------------- | -------------------------------------------------- |
| `response-file` | Path to the file containing the AI analysis result |

## Triage Templates

The action supports several triage templates:

### AI-Powered Triage Templates

- **`single-label`**: Selects the best single label from available options
- **`multi-label`**: Can select multiple relevant labels
- **`regression`**: Specifically checks if an issue is a regression
- **`missing-info`**: Identifies issues that need more information

### Engagement Scoring Template

- **`engagement-score`**: Calculates numerical engagement scores for issues based on community activity

## Engagement Scoring System

The engagement scoring system provides a data-driven approach to prioritizing issues based on community activity and
involvement. It calculates numerical scores using a weighted algorithm that considers multiple factors.

### How It Works

The engagement scoring algorithm analyzes the following factors:

- **Comments** (Weight: 3) - Number of comments on the issue
- **Reactions** (Weight: 1) - Total reactions (👍, 🎉, ❤️, etc.)
- **Contributors** (Weight: 2) - Number of unique contributors
- **Time Factors** (Weight: 1) - Days since last activity and issue age
- **Pull Requests** (Weight: 2) - Number of linked pull requests

### Usage Modes

#### Project-Wide Engagement Scoring

Calculate engagement scores for all issues in a GitHub Project:

```yaml
- name: Calculate engagement scores for project
  uses: mattleibow/triage-assistant@v0
  with:
    template: engagement-score
    project: 1 # Your project number
    apply-scores: true
    project-column: 'Engagement Score'
```

#### Single Issue Engagement Scoring

Calculate engagement score for a specific issue:

```yaml
- name: Calculate engagement score for issue
  uses: mattleibow/triage-assistant@v0
  with:
    template: engagement-score
    issue: 123 # Specific issue number
    apply-scores: false # Just calculate, don't update
```

### Score Interpretation

- **High Scores (>50)** - Issues with significant community engagement that may need immediate attention
- **Medium Scores (10-50)** - Issues with moderate activity that have potential for growth
- **Low Scores (<10)** - Issues with limited engagement that may need promotion or closure
- **Historic Comparison** - The system also calculates previous week scores to show activity trends

### Algorithm Details

The engagement score is calculated using the following formula:

```pwsh
Score = (Comments × 3) + (Reactions × 1) + (Contributors × 2) + (Time Factors × 1) + (Pull Requests × 2)
```

Where:

- **Comments**: Total number of comments on the issue
- **Reactions**: Sum of all reaction types (👍, 👎, 😄, 🎉, 😕, ❤️, 🚀, 👀)
- **Contributors**: Number of unique users who have commented or reacted
- **Time Factors**: Calculated based on days since last activity and issue age
- **Pull Requests**: Number of pull requests that reference the issue

The algorithm also calculates a "previous score" based on activity from 7 days ago, allowing for trend analysis and
identification of issues gaining or losing momentum.

### Project Integration

The engagement scoring system integrates with GitHub Projects v2 to automatically update project fields with calculated
scores. This enables:

- Automated issue prioritization based on community engagement
- Visual dashboards showing engagement trends
- Filtering and sorting issues by engagement level
- Historical tracking of issue engagement over time

### Required Permissions

For engagement scoring, ensure your workflow has these permissions:

```yaml
permissions:
  contents: read
  issues: read
  pull-requests: read
  repository-projects: write # For updating project fields
```

## AI Model Configuration

The action uses AI models from GitHub Models by default. You can configure the model using environment variables:

```yaml
env:
  TRIAGE_AI_MODEL: openai/gpt-4o-mini # Use a specific model
  TRIAGE_AI_ENDPOINT: https://models.github.ai/inference # Custom endpoint
```

## Permissions

The action requires different permissions depending on the features used:

### Basic Triage Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: write # To add labels and comments to issues
  pull-requests: write # To add labels and comments to pull requests
  models: read # To access GitHub Models for AI inference
```

### Engagement Scoring Permissions

```yaml
permissions:
  contents: read # To read repository content
  issues: read # To read issue data for scoring
  pull-requests: read # To read PR data for scoring
  repository-projects: write # To update project fields with scores
  models: read # To access GitHub Models (if AI features are used)
```

## Example: Complete Triage Setup

For a complete example of how to set up automated triage, see the [triage.yml](./.github/workflows/triage.yml) workflow
in this repository.

### Example: Engagement Scoring Workflow

Here's a complete workflow that calculates engagement scores for all issues in a project:

```yaml
name: 'Calculate Engagement Scores'

on:
  schedule:
    # Run weekly on Mondays at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Allow manual triggering

permissions:
  contents: read
  issues: read
  pull-requests: read
  repository-projects: write

jobs:
  engagement-scoring:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate engagement scores for project
        uses: mattleibow/triage-assistant@v0
        with:
          template: engagement-score
          project: 1 # Replace with your project number
          apply-scores: true
          project-column: 'Engagement Score'
          dry-run: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Calculate engagement score for specific issue
        uses: mattleibow/triage-assistant@v0
        with:
          template: engagement-score
          issue: ${{ github.event.issue.number }}
          apply-scores: false
        if: github.event_name == 'issues' && github.event.action == 'opened'
```

### Example: Combined Triage and Engagement Workflow

```yaml
name: 'Complete Issue Triage'

on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  pull-requests: write
  repository-projects: write
  models: read

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      # Step 1: Apply AI-powered labels
      - name: Apply area labels
        uses: mattleibow/triage-assistant@v0
        with:
          template: multi-label
          label-prefix: 'area-'
          apply-labels: true
          apply-comment: true

      # Step 2: Calculate engagement score
      - name: Calculate engagement score
        uses: mattleibow/triage-assistant@v0
        with:
          template: engagement-score
          issue: ${{ github.event.issue.number }}
          apply-scores: true
          project: 1 # Your project number
          project-column: 'Engagement Score'
```

## Customization

The action automatically discovers available labels in your repository and uses them for triage. Make sure your
repository has appropriate labels with descriptive names and descriptions for best results.

For labels with prefixes (e.g., `area-api`, `area-docs`, `platform/android`), use the `label-prefix` input to focus the
AI on specific label categories.

## Troubleshooting

### General Issues

- Ensure your GitHub token has the necessary permissions
- Check that the AI model you're using is available in GitHub Models
- Verify that labels exist in your repository before trying to apply them
- Review the AI response file output for detailed analysis information

### Engagement Scoring Issues

- **"Project not found"**: Ensure the project number is correct and the token has `repository-projects: write`
  permission
- **"Field not found"**: Verify the project field name matches exactly (case-sensitive)
- **"No issues found"**: Check that the project contains issues and they are accessible
- **Permission errors**: Ensure your workflow has `repository-projects: write` permission for project updates

### Debugging Tips

- Use `dry-run: true` to test configurations without making changes
- Check the action logs for detailed error messages
- Verify project field names are exactly as they appear in your GitHub Project
- Ensure your GitHub token has access to the specified project

## Contributing

Thank you for your interest in contributing to the AI Triage Assistant! This guide will help you get started with
development.

### Initial Setup

After you've cloned the repository to your local machine or codespace, you'll need to perform some initial setup steps
before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of [Node.js](https://nodejs.org) handy (20.x or later should work!).
> If you are using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`fnm`](https://github.com/Schniz/fnm), this template has a `.node-version` file at the root of the repository that
> can be used to automatically switch to the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node` actions.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

2. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

3. :white_check_mark: Run the tests

   ```bash
   npm test
   ```

### Development Workflow

1. Create a new branch

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes to the source code in `src/`
3. Add tests to `__tests__/` for your changes
4. Format, test, and build the action

   ```bash
   npm run all
   ```

   > This step is important! It will run [`rollup`](https://rollupjs.org/) to build the final JavaScript action code
   > with all dependencies included. If you do not run this step, your action will not work correctly when it is used in
   > a workflow.

5. (Optional) Test your action locally

   The [`@github/local-action`](https://github.com/github/local-action) utility can be used to test your action locally.
   It is a simple command-line tool that "stubs" (or simulates) the GitHub Actions Toolkit. This way, you can run your
   TypeScript action locally without having to commit and push your changes to a repository.

   The `local-action` utility can be run in the following ways:
   - Visual Studio Code Debugger

     Make sure to review and, if needed, update [`.vscode/launch.json`](./.vscode/launch.json)

   - Terminal/Command Prompt

     ```bash
     # npx @github/local action <action-yaml-path> <entrypoint> <dotenv-file>
     npx @github/local-action . src/main.ts .env
     ```

   You can provide a `.env` file to the `local-action` CLI to set environment variables used by the GitHub Actions
   Toolkit. For example, setting inputs and event payload data used by your action. For more information, see the
   example file, [`.env.example`](./.env.example), and the
   [GitHub Actions Documentation](https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables).

6. Commit your changes

   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   ```

7. Push them to your repository

   ```bash
   git push -u origin feature/your-feature-name
   ```

8. Create a pull request and get feedback on your changes

### Testing

You can validate the action by referencing it in a workflow file. For example, [`ci.yml`](./.github/workflows/ci.yml)
demonstrates how to reference an action in the same repository.

For example workflow runs, check out the [Actions tab](https://github.com/mattleibow/triage-assistant/actions)! :rocket:

### Publishing a New Release

This project includes a helper script, [`script/release`](./script/release) designed to streamline the process of
tagging and pushing new releases for GitHub Actions.

GitHub Actions allows users to select a specific version of the action to use, based on release tags. This script
simplifies this process by performing the following steps:

1. **Retrieving the latest release tag:** The script starts by fetching the most recent SemVer release tag of the
   current branch, by looking at the local data available in your repository.
2. **Prompting for a new release tag:** The user is then prompted to enter a new release tag. To assist with this, the
   script displays the tag retrieved in the previous step, and validates the format of the inputted tag (vX.X.X). The
   user is also reminded to update the version field in package.json.
3. **Tagging the new release:** The script then tags a new release and syncs the separate major tag (e.g. v1, v2) with
   the new release tag (e.g. v1.0.0, v2.1.2). When the user is creating a new major release, the script auto-detects
   this and creates a `releases/v#` branch for the previous major version.
4. **Pushing changes to remote:** Finally, the script pushes the necessary commits, tags and branches to the remote
   repository. From here, you will need to create a new release in GitHub so users can easily reference the new tags in
   their workflows.

### Dependency License Management

This template includes a GitHub Actions workflow, [`licensed.yml`](./.github/workflows/licensed.yml), that uses
[Licensed](https://github.com/licensee/licensed) to check for dependencies with missing or non-compliant licenses. This
workflow is initially disabled. To enable the workflow, follow the below steps.

1. Open [`licensed.yml`](./.github/workflows/licensed.yml)
2. Uncomment the following lines:

   ```yaml
   # pull_request:
   #   branches:
   #     - main
   # push:
   #   branches:
   #     - main
   ```

3. Save and commit the changes

Once complete, this workflow will run any time a pull request is created or changes pushed directly to `main`. If the
workflow detects any dependencies with missing or non-compliant licenses, it will fail the workflow and provide details
on the issue(s) found.

#### Updating Licenses

Whenever you install or update dependencies, you can use the Licensed CLI to update the licenses database. To install
Licensed, see the project's [Readme](https://github.com/licensee/licensed?tab=readme-ov-file#installation).

To update the cached licenses, run the following command:

```bash
licensed cache
```

To check the status of cached licenses, run the following command:

```bash
licensed status
```

### Code Style

This project uses:

- **Prettier** for code formatting
- **ESLint** for code linting
- **Jest** for testing

Make sure to run `npm run all` before submitting your changes to ensure your code passes all checks.

### Getting Help

If you have questions about contributing, feel free to:

- Open an issue for discussion
- Check existing issues and pull requests
- Review the [GitHub Actions documentation](https://docs.github.com/en/actions)
