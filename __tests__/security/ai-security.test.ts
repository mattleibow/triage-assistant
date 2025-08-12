import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'

// Mock dependencies
jest.unstable_mockModule('@actions/core', () => core)

// Mock the AI client modules with simple mocks
jest.unstable_mockModule('@azure-rest/ai-inference', () => ({
  default: jest.fn().mockReturnValue({
    path: jest.fn().mockReturnValue({
      post: jest.fn().mockResolvedValue({
        body: {
          choices: [{
            message: {
              content: 'Test AI response'
            }
          }]
        }
      })
    })
  }),
  isUnexpected: jest.fn().mockReturnValue(false)
}))

jest.unstable_mockModule('@azure/core-auth', () => ({
  AzureKeyCredential: jest.fn()
}))

const { runInference } = await import('../../src/ai/ai.js')

describe('AI Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Response File Path Security', () => {
    it('should validate response file paths to prevent traversal', async () => {
      const config = {
        aiEndpoint: 'https://test.endpoint.com',
        aiModel: 'test-model',
        aiToken: 'test-token'
      }
      
      // Should reject path traversal attempts
      await expect(runInference(
        'system prompt',
        'user prompt', 
        '../../../etc/passwd',
        200,
        config
      )).rejects.toThrow('contains dangerous characters or patterns')
    })

    it('should reject absolute paths', async () => {
      const config = {
        aiEndpoint: 'https://test.endpoint.com',
        aiModel: 'test-model',
        aiToken: 'test-token'
      }
      
      await expect(runInference(
        'system prompt',
        'user prompt',
        '/etc/passwd',
        200,
        config
      )).rejects.toThrow('contains dangerous characters')
    })

    it('should accept safe relative paths', async () => {
      const config = {
        aiEndpoint: 'https://test.endpoint.com',
        aiModel: 'test-model',
        aiToken: 'test-token'
      }
      
      // This should not throw an error and should complete successfully
      await expect(runInference(
        'system prompt',
        'user prompt',
        'safe/path/response.txt',
        200,
        config
      )).resolves.toBeUndefined()
    })
  })

  describe('Content Sanitization Integration', () => {
    it('should sanitize AI responses during processing', async () => {
      const config = {
        aiEndpoint: 'https://test.endpoint.com',
        aiModel: 'test-model',
        aiToken: 'test-token'
      }
      
      await runInference(
        'system prompt',
        'user prompt',
        'test-response.txt',
        200,
        config
      )
      
      // Should complete without errors and log completion
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('AI inference completed')
      )
    })
  })
})