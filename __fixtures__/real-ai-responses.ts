/**
 * Real AI response test data fixtures
 * These represent realistic AI triage responses that match the TriageResponse interface
 */

import { TriageResponse } from '../src/triage-response.js'

/**
 * Sample AI responses for different types of issues
 * These match the structure expected by the TriageResponse interface
 */

export const bugReportResponse: TriageResponse = {
  labels: [
    {
      label: 'type/bug',
      reason: 'Clear bug report with reproducible steps, error logs, and specific environment details. The NullReferenceException and crash behavior clearly indicate a software defect.'
    }
  ],
  remarks: [],
  regression: null
}

export const featureRequestResponse: TriageResponse = {
  labels: [
    {
      label: 'type/feature',
      reason: 'This is a feature request for dark mode support with clear benefits, proposed solution, and user demand mentioned. Not a bug or documentation issue.'
    }
  ],
  remarks: [],
  regression: null
}

export const documentationResponse: TriageResponse = {
  labels: [
    {
      label: 'type/docs',
      reason: 'Issue specifically requests improvements to API documentation, mentioning missing endpoints and examples. This is clearly a documentation enhancement request.'
    }
  ],
  remarks: [],
  regression: null
}

export const questionResponse: TriageResponse = {
  labels: [
    {
      label: 'question',
      reason: 'User is asking for help with SSL certificate configuration. This is a support request rather than a bug report or feature request.'
    }
  ],
  remarks: [],
  regression: null
}

export const regressionResponse: TriageResponse = {
  labels: [
    {
      label: 'type/bug',
      reason: 'Performance degradation with specific version comparison data. This is a clear regression with measurable impact on production systems.'
    }
  ],
  remarks: [],
  regression: {
    'working-version': '2.0.5',
    'broken-version': '2.1.0',
    evidence: 'Performance metrics show 10x increase in page load times (200ms → 2000ms) and doubled memory usage (50MB → 100MB) after upgrading from v2.0.5 to v2.1.0'
  }
}

export const securityResponse: TriageResponse = {
  labels: [
    {
      label: 'type/bug',
      reason: 'Security vulnerability in authentication module with potential for unauthorized access and privilege escalation. High severity security issues are classified as bugs requiring immediate attention.'
    },
    {
      label: 'priority/high',
      reason: 'Security vulnerabilities require immediate attention due to potential data exposure and security risks.'
    }
  ],
  remarks: [],
  regression: null
}

export const multiLabelResponse: TriageResponse = {
  labels: [
    {
      label: 'type/bug',
      reason: 'CI test failures indicate a bug in the system after dependency updates.'
    },
    {
      label: 'area/ci',
      reason: 'Issue specifically affects the continuous integration pipeline and automated testing.'
    },
    {
      label: 'needs-investigation',
      reason: 'Tests pass locally but fail in CI, suggesting environment-specific issues that need investigation.'
    }
  ],
  remarks: [],
  regression: null
}

export const noLabelResponse: TriageResponse = {
  labels: [],
  remarks: [
    'Issue content is too vague or incomplete to assign appropriate labels. Missing critical information such as steps to reproduce, error details, or specific requirements.'
  ],
  regression: null
}

export const complexResponse: TriageResponse = {
  labels: [
    {
      label: 'type/bug',
      reason: 'Memory leak causing application crashes in production environment.'
    },
    {
      label: 'priority/high',
      reason: 'Affects production systems with high user impact and data loss potential.'
    },
    {
      label: 'area/core',
      reason: 'Issue is in the core memory management system affecting overall application stability.'
    }
  ],
  remarks: [
    'This issue appears to be related to improper memory cleanup in the core processing module.',
    'Recommend immediate investigation and hotfix deployment to production.'
  ],
  regression: {
    'working-version': '3.2.1',
    'broken-version': '3.3.0',
    evidence: 'Memory usage patterns changed significantly after the 3.3.0 release with introduction of new caching mechanism. Heap dumps show uncleaned object references.'
  }
}

/**
 * Sample of malformed or edge case AI responses that should be handled gracefully
 */
export const edgeCaseResponses = {
  emptyResponse: {
    labels: [],
    remarks: [],
    regression: null
  } as TriageResponse,

  malformedLabels: {
    labels: [
      { label: '', reason: 'Empty label name' },
      { label: 'valid-label', reason: '' },
      { label: 'type/bug', reason: 'Valid label with reason' }
    ],
    remarks: [],
    regression: null
  } as TriageResponse,

  invalidRegression: {
    labels: [
      { label: 'type/bug', reason: 'Bug with incomplete regression data' }
    ],
    remarks: [],
    regression: {
      'working-version': '',
      'broken-version': '2.1.0',
      evidence: 'Incomplete regression information'
    }
  } as TriageResponse,

  longRemarks: {
    labels: [
      { label: 'needs-triage', reason: 'Complex issue requiring detailed analysis' }
    ],
    remarks: [
      'This issue involves multiple subsystems and requires careful analysis to determine the root cause.',
      'Initial investigation suggests database connection pooling issues during high load scenarios.',
      'Recommend coordination with infrastructure team to review connection limits and timeout configurations.'
    ],
    regression: null
  } as TriageResponse
}

/**
 * Response examples for different triage templates
 */
export const templateResponses = {
  singleLabel: bugReportResponse,
  multiLabel: multiLabelResponse,
  regression: regressionResponse,
  missingInfo: noLabelResponse
}

/**
 * Helper function to create responses for testing different scenarios
 */
export function createTestResponse(
  labels: Array<{ label: string; reason: string }>,
  remarks: string[] = [],
  regression: TriageResponse['regression'] = null
): TriageResponse {
  return {
    labels,
    remarks,
    regression
  }
}

/**
 * Responses mapped to issue numbers for consistent testing
 */
export const issueResponseMap = new Map<number, TriageResponse>([
  [1234, bugReportResponse],
  [1235, featureRequestResponse],
  [1236, documentationResponse],
  [1237, questionResponse],
  [1238, regressionResponse],
  [1239, securityResponse],
  [1240, multiLabelResponse]
])