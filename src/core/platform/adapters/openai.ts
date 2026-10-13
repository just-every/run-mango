import type { AiGenerationResult, AiProvider, GroundedGenerationRequest } from '@/core/shared/platform';

import { asRecord, responseJson, stringValue } from './http';

export function createOpenAiAdapter(options: { apiKey: string; model: string }): AiProvider {
  return {
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
      const payload = asRecord(await responseJson(response), 'OpenAI returned an invalid Responses API response.');
      const output = stringValue(payload.output_text, 'OpenAI did not return structured proposal output.');
      const usage = asRecord(payload.usage, 'OpenAI did not return usage for the grounded generation.');
      const inputTokens = usage.input_tokens;
      const outputTokens = usage.output_tokens;
      if (typeof inputTokens !== 'number' || !Number.isSafeInteger(inputTokens) || inputTokens < 0
        || typeof outputTokens !== 'number' || !Number.isSafeInteger(outputTokens) || outputTokens < 0) {
        throw new Error('OpenAI returned invalid usage for the grounded generation.');
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(output) as unknown;
      } catch {
        throw new Error('OpenAI returned output that is not valid JSON for the requested schema.');
      }
      return {
        output: parsed,
        provider: 'openai',
        model: stringValue(payload.model, 'OpenAI did not return the model used for the grounded generation.'),
        billableUnits: inputTokens + outputTokens,
      };
    },
  };
}
