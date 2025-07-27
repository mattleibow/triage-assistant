import { EngagementClassification } from '../src/engagement/engagement-types.js'

describe('Engagement Scoring', () => {
  it('should define engagement classifications', () => {
    expect(EngagementClassification.Hot).toBe('Hot')
  })
})