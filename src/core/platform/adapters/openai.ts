import type { AiGenerationResult, AiProvider, GroundedGenerationRequest } from '@/core/shared/platform';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function createOpenAiAdapter(options: { apiKey: string; model: string }): AiProvider {
  return {
    costIdentity: { provider: 'openai', model: options.model },
    async generateGroundedJson(request: GroundedGenerationRequest): Promise<AiGenerationResult> {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          instructions: request.instructions,
          input: JSON.stringify(request.evidence),
          text: {
            format: {
              type: 'json_schema',
              name: 'mango_grounded_proposal',
              strict: true,
              schema: request.schema,
            },
          },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      let responseBody: unknown;
      try { responseBody = await response.json(); } catch { responseBody = null; }
      const payload = record(responseBody);
      // The response can be billable even when its output violates the requested schema.
      const output = typeof payload.output_text === 'string' ? payload.output_text
        : Array.isArray(payload.output) ? payload.output.flatMap((item: unknown) => { const content = record(item).content; return Array.isArray(content) ? content : []; })
          .map((item: unknown) => record(item)).filter(item => item.type === 'output_text' && typeof item.text === 'string').map(item => item.text).join('') : '';
      const usage = record(payload.usage);
      const knownUnits = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
      const inputTokens = usage.input_tokens, outputTokens = usage.output_tokens;
      const combined = knownUnits(inputTokens) && knownUnits(outputTokens) ? inputTokens + outputTokens : null;
      const billableUnits = knownUnits(usage.total_tokens) ? usage.total_tokens
        : knownUnits(combined) ? combined : knownUnits(inputTokens) ? inputTokens : knownUnits(outputTokens) ? outputTokens : null;
      const unitKind = knownUnits(usage.total_tokens) || knownUnits(combined) ? 'tokens'
        : knownUnits(inputTokens) ? 'input tokens' : knownUnits(outputTokens) ? 'output tokens' : 'tokens';
      let parsed: unknown = null;
      try { if (response.ok) parsed = JSON.parse(output) as unknown; } catch { /* The proposal validator records invalid output. */ }
      return {
        output: parsed,
        provider: 'openai',
        model: typeof payload.model === 'string' ? payload.model : options.model,
        billableUnits, unitKind,
      };
    },
  };
}
