/**
 * Test to validate the real data fixtures are correctly structured
 */

import { realGitHubIssues, expectedTriageResults, sampleLabels } from '../__fixtures__/real-github-issues.js'
import { 
  bugReportResponse, 
  featureRequestResponse,
  regressionResponse,
  issueResponseMap 
} from '../__fixtures__/real-ai-responses.js'
import { 
  singleLabelConfig, 
  createConfigForIssue,
  allTemplateConfigs 
} from '../__fixtures__/real-configs.js'

describe('Real Test Data Fixtures', () => {
  describe('GitHub Issues Fixtures', () => {
    it('should contain realistic issue data', () => {
      expect(realGitHubIssues).toHaveLength(7)
      
      // Check first issue (crash report)
      const crashIssue = realGitHubIssues[0]
      expect(crashIssue.number).toBe(1234)
      expect(crashIssue.title).toContain('crashes when clicking save')
      expect(crashIssue.body).toContain('NullReferenceException')
      expect(crashIssue.body).toContain('Steps to Reproduce')
      expect(crashIssue.state).toBe('open')
    })

    it('should have diverse issue types', () => {
      const titles = realGitHubIssues.map(issue => issue.title.toLowerCase())
      
      expect(titles.some(title => title.includes('crash'))).toBe(true)
      expect(titles.some(title => title.includes('dark mode'))).toBe(true)  
      expect(titles.some(title => title.includes('documentation'))).toBe(true)
      expect(titles.some(title => title.includes('ssl'))).toBe(true)
      expect(titles.some(title => title.includes('regression'))).toBe(true)
      expect(titles.some(title => title.includes('security'))).toBe(true)
      expect(titles.some(title => title.includes('test'))).toBe(true)
    })

    it('should have corresponding expected results', () => {
      realGitHubIssues.forEach(issue => {
        const expectedResult = expectedTriageResults[issue.number as keyof typeof expectedTriageResults]
        expect(expectedResult).toBeDefined()
        expect(expectedResult.labels).toBeDefined()
        expect(expectedResult.labels).toHaveLength(1)
        expect(expectedResult.priority).toBeDefined()
      })
    })
  })

  describe('AI Response Fixtures', () => {
    it('should have properly structured bug report response', () => {
      expect(bugReportResponse.labels).toHaveLength(1)
      expect(bugReportResponse.labels[0].label).toBe('type/bug')
      expect(bugReportResponse.labels[0].reason).toContain('Clear bug report')
      expect(bugReportResponse.regression).toBeNull()
      expect(bugReportResponse.remarks).toEqual([])
    })

    it('should have feature request response', () => {
      expect(featureRequestResponse.labels).toHaveLength(1)
      expect(featureRequestResponse.labels[0].label).toBe('type/feature')
      expect(featureRequestResponse.labels[0].reason).toContain('feature request')
    })

    it('should have regression response with version data', () => {
      expect(regressionResponse.labels).toHaveLength(1)
      expect(regressionResponse.regression).toBeDefined()
      expect(regressionResponse.regression!['working-version']).toBe('2.0.5')
      expect(regressionResponse.regression!['broken-version']).toBe('2.1.0')
      expect(regressionResponse.regression!.evidence).toContain('Performance metrics')
    })

    it('should map issues to responses correctly', () => {
      expect(issueResponseMap.size).toBeGreaterThan(0)
      expect(issueResponseMap.get(1234)).toEqual(bugReportResponse)
      expect(issueResponseMap.get(1235)).toEqual(featureRequestResponse)
      expect(issueResponseMap.get(1238)).toEqual(regressionResponse)
    })
  })

  describe('Configuration Fixtures', () => {
    it('should have complete single label config', () => {
      expect(singleLabelConfig.template).toBe('single-label')
      expect(singleLabelConfig.labelPrefix).toBe('type/')
      expect(singleLabelConfig.label).toBe('bug')
      expect(singleLabelConfig.repository).toBe('example/awesome-project')
      expect(singleLabelConfig.issueNumber).toBe(1234)
      expect(singleLabelConfig.aiModel).toBe('gpt-4')
      expect(singleLabelConfig.tempDir).toBe('/tmp/triage-test')
    })

    it('should create configs for different issues', () => {
      const config1 = createConfigForIssue(999)
      const config2 = createConfigForIssue(888, 'multi-label')
      
      expect(config1.issueNumber).toBe(999)
      expect(config1.template).toBe('single-label')
      
      expect(config2.issueNumber).toBe(888)
      expect(config2.template).toBe('multi-label')
    })

    it('should have configs for all templates', () => {
      expect(allTemplateConfigs).toHaveLength(4)
      
      const templates = allTemplateConfigs.map(config => config.template)
      expect(templates).toContain('single-label')
      expect(templates).toContain('multi-label')
      expect(templates).toContain('regression')
      expect(templates).toContain('missing-info')
    })
  })

  describe('Label Fixtures', () => {
    it('should have diverse label types', () => {
      expect(sampleLabels.length).toBeGreaterThan(10)
      
      const labelNames = sampleLabels.map(label => label.name)
      expect(labelNames).toContain('bug')
      expect(labelNames).toContain('enhancement')
      expect(labelNames).toContain('documentation')
      expect(labelNames).toContain('question')
    })

    it('should have prefixed labels', () => {
      const labelNames = sampleLabels.map(label => label.name)
      
      expect(labelNames.some(name => name.startsWith('type/'))).toBe(true)
      expect(labelNames.some(name => name.startsWith('priority/'))).toBe(true)
      expect(labelNames.some(name => name.startsWith('area/'))).toBe(true)
    })

    it('should have proper label structure', () => {
      sampleLabels.forEach(label => {
        expect(label.name).toBeTruthy()
        expect(label.description).toBeDefined()
        expect(label.color).toMatch(/^[0-9a-f]{6}$/i)
      })
    })
  })

  describe('Data Consistency', () => {
    it('should have consistent issue numbers across fixtures', () => {
      const issueNumbers = realGitHubIssues.map(issue => issue.number)
      const expectedNumbers = Object.keys(expectedTriageResults).map(Number)
      const responseMapNumbers = Array.from(issueResponseMap.keys())
      
      // Check that all expected results have corresponding issues
      expectedNumbers.forEach(num => {
        expect(issueNumbers).toContain(num)
      })
      
      // Check that all response mappings have corresponding issues  
      responseMapNumbers.forEach(num => {
        expect(issueNumbers).toContain(num)
      })
    })

    it('should have realistic issue content', () => {
      realGitHubIssues.forEach(issue => {
        // All issues should have meaningful content
        expect(issue.title.length).toBeGreaterThan(10)
        expect(issue.body.length).toBeGreaterThan(50)
        expect(issue.user.login).toBeTruthy()
        expect(issue.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
        expect(issue.url).toContain('github.com')
      })
    })

    it('should have valid AI response structures', () => {
      const allResponses = [bugReportResponse, featureRequestResponse, regressionResponse]
      
      allResponses.forEach(response => {
        expect(response.labels).toBeDefined()
        expect(response.remarks).toBeDefined() 
        expect(Array.isArray(response.labels)).toBe(true)
        expect(Array.isArray(response.remarks)).toBe(true)
        
        response.labels.forEach(label => {
          expect(label.label).toBeTruthy()
          expect(label.reason).toBeTruthy()
        })
      })
    })
  })
})