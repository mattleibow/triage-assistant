# Batch Label Application Example

## Overview

The triage assistant now supports batch label application through configuration in the `.triagerc.yml` file. This allows
you to define multiple label groups and apply them all in a single workflow run.

## Configuration Format

Create a `.triagerc.yml` file in your repository root or `.github/` directory:

```yaml
engagement:
  weights:
    comments: 3
    reactions: 1
    contributors: 2
    lastActivity: 1
    issueAge: 1
    linkedPullRequests: 2

labels:
  groups:
    overlap:
      label-prefix: 'overlap-'
      template: 'multi-label'
    area:
      label-prefix: 'area-'
      template: 'single-label'
    regression:
      label: 'regression'
      template: 'regression'
```

## Usage

### Before (Multiple Workflow Steps)

```yaml
- name: Determine OVERLAP label for the issue
  id: triage-overlap
  uses: ./apply-labels/
  with:
    issue: ${{ steps.get-number.outputs.number }}
    label-prefix: 'overlap-'
    template: 'multi-label'

- name: Determine AREA label for the issue
  id: triage-area
  uses: ./apply-labels/
  with:
    issue: ${{ steps.get-number.outputs.number }}
    label-prefix: 'area-'
    template: 'single-label'

- name: Determine REGRESSION label for the issue
  id: triage-regression
  uses: ./apply-labels/
  with:
    issue: ${{ steps.get-number.outputs.number }}
    label: 'regression'
    template: 'regression'

- name: Apply Labels and Comment
  uses: ./apply-labels/
  with:
    issue: ${{ steps.get-number.outputs.number }}
    apply-labels: true
    apply-comment: true
    dry-run: ${{ inputs.dry_run || false }}
```

### After (Single Workflow Step)

```yaml
- name: Determine and Apply labels
  uses: ./apply-labels/
  with:
    issue: ${{ steps.get-number.outputs.number }}
    apply-labels: true
    apply-comment: true
    dry-run: ${{ inputs.dry_run || false }}
```

## How It Works

1. When no `template` is provided, the action enters "batch mode"
2. It loads the `.triagerc.yml` configuration file
3. For each label group defined in `labels.groups`, it:
   - Creates a separate AI inference request using the group's template
   - Uses the group's label-prefix or specific label
   - Generates appropriate prompts for the template type
4. All responses are merged together and applied to the issue

## Label Group Configuration

Each label group supports these properties:

- **`template`** (required): The AI template to use ('multi-label', 'single-label', 'regression', 'missing-info')
- **`label-prefix`** (optional): Prefix for label search (e.g., 'area-', 'platform-')
- **`label`** (optional): Specific label to use (typically for 'regression' template)

## Backward Compatibility

The action remains fully backward compatible. If a `template` is provided in the workflow inputs, it will use
single-template mode as before.
