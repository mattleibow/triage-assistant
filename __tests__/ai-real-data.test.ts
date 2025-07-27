/**
 * Unit tests for AI module using real data fixtures
 * Tests the AI inference functionality with realistic scenarios
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/actions-core.js'

// Mock dependencies
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@azure-rest/ai-inference', () => ({
  default: jest.fn().mockImplementation(() => ({
    path: {
      '/chat/completions': {
        post: jest.fn()
      }
    }
  }))
}))

// Import test data
import { 
  bugReportResponse, 
  featureRequestResponse, 
  regressionResponse,
  edgeCaseResponses 
} from '../__fixtures__/real-ai-responses.js'
import { 
  singleLabelConfig, 
  multiLabelConfig, 
  gpt35Config 
} from '../__fixtures__/real-configs.js'
import { FileSystemMock } from './helpers/filesystem-mock.js'

// Import the module being tested
const { runInference } = await import('../src/ai.js')

describe('AI Module with Real Data', () => {
  const inMemoryFs = new FileSystemMock()
  let mockAiClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    inMemoryFs.setup()

    // Mock the AI client
    const aiInference = require('@azure-rest/ai-inference').default
    mockAiClient = {
      path: {
        '/chat/completions': {
          post: jest.fn()
        }
      }
    }
    aiInference.mockImplementation(() => mockAiClient)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    inMemoryFs.teardown()
  })

  describe('runInference with realistic prompts', () => {
    it('should process bug report and return structured response', async () => {
      const systemPrompt = `You are an expert triage assistant who assigns labels to GitHub issues.
      
Analyze the issue and respond with JSON containing:
- labels: array of {label: string, reason: string}
- remarks: array of strings
- regression: null or {working-version, broken-version, evidence}`

      const userPrompt = `Issue #1234: Application crashes when clicking save button

The application crashes every time I click the save button. This happens consistently.

Steps to Reproduce:
1. Open the application
2. Navigate to the editor
3. Make changes to a document
4. Click "Save" button
5. Application crashes

Error: NullReferenceException at SaveManager.Save() line 42`

      const responseFile = '/tmp/test/response-1234.json'

      // Mock successful AI response
      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(bugReportResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 100, singleLabelConfig)

      // Verify AI client was called with correct parameters
      expect(mockAiClient.path['/chat/completions'].post).toHaveBeenCalledWith({
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: 'gpt-4',
          max_tokens: 100,
          temperature: 0.1
        }
      })

      // Verify response was written to file
      expect(inMemoryFs.has(responseFile)).toBe(true)
      const savedResponse = JSON.parse(inMemoryFs.get(responseFile) || '{}')
      expect(savedResponse.labels).toHaveLength(1)
      expect(savedResponse.labels[0].label).toBe('type/bug')
    })

    it('should handle feature request classification', async () => {
      const systemPrompt = 'Classify GitHub issues and assign appropriate labels.'
      const userPrompt = `Issue #1235: Add dark mode support

Feature Request: It would be great to have a dark mode option for the application.

Proposed Solution:
- Add toggle in settings menu
- Implement dark color scheme
- Remember user preference

Benefits:
- Better user experience in low-light
- Reduced eye strain
- Modern appearance`

      const responseFile = '/tmp/test/response-1235.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(featureRequestResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 150, multiLabelConfig)

      expect(mockAiClient.path['/chat/completions'].post).toHaveBeenCalled()
      expect(inMemoryFs.has(responseFile)).toBe(true)
      
      const savedResponse = JSON.parse(inMemoryFs.get(responseFile) || '{}')
      expect(savedResponse.labels[0].label).toBe('type/feature')
    })

    it('should detect regression with version information', async () => {
      const systemPrompt = 'Analyze issues for potential regressions and version problems.'
      const userPrompt = `Issue #1238: Performance regression after v2.1.0 update

After upgrading from v2.0.5 to v2.1.0, performance degraded significantly.

Version 2.0.5 (Working):
- Page load: 180-220ms  
- Memory: ~50MB
- CPU: 5-10%

Version 2.1.0 (Broken):
- Page load: 1800-2200ms
- Memory: ~100MB  
- CPU: 25-40%

This affects production with 1000+ users.`

      const responseFile = '/tmp/test/response-1238.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(regressionResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 200, singleLabelConfig)

      const savedResponse = JSON.parse(inMemoryFs.get(responseFile) || '{}')
      expect(savedResponse.regression).toBeDefined()
      expect(savedResponse.regression['working-version']).toBe('2.0.5')
      expect(savedResponse.regression['broken-version']).toBe('2.1.0')
    })

    it('should use different AI models correctly', async () => {
      const systemPrompt = 'Classify this issue.'
      const userPrompt = 'Simple test issue'
      const responseFile = '/tmp/test/response-gpt35.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(bugReportResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 100, gpt35Config)

      expect(mockAiClient.path['/chat/completions'].post).toHaveBeenCalledWith({
        body: expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      })
    })

    it('should handle different token limits', async () => {
      const systemPrompt = 'Short prompt'
      const userPrompt = 'Short issue'
      const responseFile = '/tmp/test/response-short.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(edgeCaseResponses.emptyResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 50, singleLabelConfig)

      expect(mockAiClient.path['/chat/completions'].post).toHaveBeenCalledWith({
        body: expect.objectContaining({
          max_tokens: 50
        })
      })
    })
  })

  describe('Error handling with real scenarios', () => {
    it('should handle AI service timeout', async () => {
      const systemPrompt = 'Test prompt'
      const userPrompt = 'Test issue'
      const responseFile = '/tmp/test/response-timeout.json'

      mockAiClient.path['/chat/completions'].post.mockRejectedValue(
        new Error('Request timeout after 30 seconds')
      )

      await expect(runInference(systemPrompt, userPrompt, responseFile, 100, singleLabelConfig))
        .rejects.toThrow('Request timeout')

      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Request timeout'))
    })

    it('should handle malformed AI response', async () => {
      const systemPrompt = 'Test prompt'
      const userPrompt = 'Test issue'
      const responseFile = '/tmp/test/response-malformed.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: 'Invalid JSON response from AI'
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 100, singleLabelConfig)

      // Should still write the raw response for debugging
      expect(inMemoryFs.has(responseFile)).toBe(true)
      expect(inMemoryFs.get(responseFile)).toContain('Invalid JSON response from AI')
    })

    it('should handle AI service authentication errors', async () => {
      const systemPrompt = 'Test prompt'
      const userPrompt = 'Test issue'
      const responseFile = '/tmp/test/response-auth-error.json'

      mockAiClient.path['/chat/completions'].post.mockRejectedValue(
        new Error('Authentication failed: Invalid API key')
      )

      await expect(runInference(systemPrompt, userPrompt, responseFile, 100, singleLabelConfig))
        .rejects.toThrow('Authentication failed')
    })

    it('should handle file system write errors', async () => {
      const systemPrompt = 'Test prompt'
      const userPrompt = 'Test issue'
      const responseFile = '/invalid/path/response.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(bugReportResponse)
            }
          }]
        }
      })

      // This should fail due to invalid path
      await expect(runInference(systemPrompt, userPrompt, responseFile, 100, singleLabelConfig))
        .rejects.toThrow()
    })
  })

  describe('Response processing', () => {
    it('should preserve complex response structures', async () => {
      const complexResponse = {
        labels: [
          { label: 'type/bug', reason: 'Primary classification' },
          { label: 'priority/high', reason: 'Critical issue affecting users' },
          { label: 'area/security', reason: 'Security implications identified' }
        ],
        remarks: [
          'This issue requires immediate attention',
          'Security team should be notified',
          'Consider hotfix release'
        ],
        regression: {
          'working-version': '1.2.0',
          'broken-version': '1.2.1',
          evidence: 'Authentication bypass confirmed in security audit'
        }
      }

      const systemPrompt = 'Complex analysis prompt'
      const userPrompt = 'Complex security issue'
      const responseFile = '/tmp/test/response-complex.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(complexResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 300, multiLabelConfig)

      const savedResponse = JSON.parse(inMemoryFs.get(responseFile) || '{}')
      expect(savedResponse.labels).toHaveLength(3)
      expect(savedResponse.remarks).toHaveLength(3)
      expect(savedResponse.regression).toBeDefined()
      expect(savedResponse.regression['working-version']).toBe('1.2.0')
    })

    it('should handle edge case responses correctly', async () => {
      const systemPrompt = 'Edge case prompt'
      const userPrompt = 'Edge case issue'
      const responseFile = '/tmp/test/response-edge.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(edgeCaseResponses.malformedLabels)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 100, singleLabelConfig)

      const savedResponse = JSON.parse(inMemoryFs.get(responseFile) || '{}')
      expect(savedResponse.labels).toHaveLength(3)
      expect(savedResponse.labels[0].label).toBe('') // Empty label preserved
      expect(savedResponse.labels[2].label).toBe('type/bug') // Valid label preserved
    })
  })

  describe('Configuration validation', () => {
    it('should validate AI endpoint configuration', async () => {
      const customEndpointConfig = {
        ...singleLabelConfig,
        aiEndpoint: 'https://custom-ai-service.example.com',
        aiModel: 'custom-model-v1',
        aiToken: 'custom-token-123'
      }

      const systemPrompt = 'Test prompt'
      const userPrompt = 'Test issue'
      const responseFile = '/tmp/test/response-custom.json'

      mockAiClient.path['/chat/completions'].post.mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: JSON.stringify(bugReportResponse)
            }
          }]
        }
      })

      await runInference(systemPrompt, userPrompt, responseFile, 100, customEndpointConfig)

      // Verify custom model was used
      expect(mockAiClient.path['/chat/completions'].post).toHaveBeenCalledWith({
        body: expect.objectContaining({
          model: 'custom-model-v1'
        })
      })
    })

    it('should handle missing configuration gracefully', async () => {
      const incompleteConfig = {
        ...singleLabelConfig,
        aiToken: '' // Missing token
      }

      const systemPrompt = 'Test prompt'
      const userPrompt = 'Test issue'
      const responseFile = '/tmp/test/response-incomplete.json'

      await expect(runInference(systemPrompt, userPrompt, responseFile, 100, incompleteConfig))
        .rejects.toThrow()
    })
  })
})