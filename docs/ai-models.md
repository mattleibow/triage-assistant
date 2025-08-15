# AI Model Configuration

The AI Triage Assistant uses AI models from GitHub Models by default, but supports custom endpoints and models.

## Configuration Methods

You can configure the AI model using inputs or environment variables:

### Using Inputs

```yaml
- name: Triage with custom AI model
  uses: mattleibow/triage-assistant@v0.7.0
  with:
    template: single-label
    label-prefix: 'area-'
    ai-model: 'openai/gpt-4o-mini'
    ai-endpoint: 'https://models.github.ai/inference'
    ai-token: ${{ secrets.CUSTOM_AI_TOKEN }}
```

### Using Environment Variables

```yaml
env:
  TRIAGE_AI_MODEL: openai/gpt-4o-mini # Use a specific model
  TRIAGE_AI_ENDPOINT: https://models.github.ai/inference # Custom endpoint
  TRIAGE_AI_TOKEN: ${{ secrets.CUSTOM_AI_TOKEN }} # Custom token
```

## Supported Models

The action works with any OpenAI-compatible API. Popular models include:

### GitHub Models (Default)

- `openai/gpt-4o` (default) - Most capable, higher cost
- `openai/gpt-4o-mini` - Faster and more cost-effective
- `openai/gpt-3.5-turbo` - Budget-friendly option

### Custom Models

Any OpenAI-compatible endpoint can be used by setting:

- `ai-endpoint`: The API endpoint URL
- `ai-model`: The model identifier
- `ai-token`: Authentication token for the endpoint

## Authentication

### Default Authentication

The action automatically falls back to using your GitHub token for authentication if no specific AI token is provided.

### Custom Authentication

For custom endpoints, provide your own authentication token:

```yaml
- name: Use custom AI service
  uses: mattleibow/triage-assistant@v0.7.0
  with:
    ai-endpoint: 'https://api.openai.com/v1'
    ai-model: 'gpt-4'
    ai-token: ${{ secrets.OPENAI_API_KEY }}
```

## Model Selection Guidelines

### For Production Use

- **`openai/gpt-4o`** - Best quality, most accurate labeling
- **`openai/gpt-4o-mini`** - Good balance of quality and speed

### For Development/Testing

- **`openai/gpt-4o-mini`** - Fast and cost-effective for testing
- **`openai/gpt-3.5-turbo`** - Basic functionality testing

### For High Volume

- **`openai/gpt-4o-mini`** - Optimized for speed and cost
- Consider rate limiting and batch processing

## Configuration Examples

### Production Setup

```yaml
- name: Production triage
  uses: mattleibow/triage-assistant@v0.7.0
  with:
    template: multi-label
    ai-model: 'openai/gpt-4o'
    apply-labels: true
    apply-comment: true
```

### Development Testing

```yaml
- name: Development testing
  uses: mattleibow/triage-assistant@v0.7.0
  with:
    template: single-label
    ai-model: 'openai/gpt-4o-mini'
    dry-run: true
```

### Custom Endpoint

```yaml
- name: Custom AI service
  uses: mattleibow/triage-assistant@v0.7.0
  with:
    template: multi-label
    ai-endpoint: 'https://your-custom-endpoint.com/v1'
    ai-model: 'your-custom-model'
    ai-token: ${{ secrets.CUSTOM_AI_TOKEN }}
```

## Rate Limits and Costs

### GitHub Models

- Default rate limits apply based on your GitHub plan
- Usage is typically included in GitHub plans
- Check GitHub Models documentation for specific limits

### Custom Endpoints

- Rate limits depend on your service provider
- Costs vary by provider and model
- Monitor usage to avoid unexpected charges

## Best Practices

### Model Selection

1. Start with `openai/gpt-4o-mini` for testing
2. Use `openai/gpt-4o` for production if quality is critical
3. Consider cost vs. quality trade-offs for your use case

### Token Management

1. Store AI tokens in GitHub Secrets
2. Use least-privilege tokens when possible
3. Rotate tokens regularly for security

### Performance Optimization

1. Use appropriate models for your workload
2. Consider batch processing for multiple issues
3. Monitor rate limits and adjust frequency accordingly

### Testing

1. Always test with `dry-run: true` first
2. Use development models for testing
3. Validate results before applying to production

## Troubleshooting

### Common Issues

**Model not available**: Check GitHub Models availability for your account **Authentication failed**: Verify your AI
token is correct and has access **Rate limit exceeded**: Reduce frequency or upgrade your plan **Invalid endpoint**:
Ensure the endpoint URL is correct and accessible

See [troubleshooting.md](troubleshooting.md) for more detailed troubleshooting information.
