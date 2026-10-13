import type { Context } from 'hono';
import { z, type ZodType } from 'zod';

export async function readJson<T>(context: Context, schema: ZodType<T>) {
  const body = await context.req.json().catch(() => undefined);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      error: context.json(
        { error: 'invalid_request', issues: z.treeifyError(parsed.error) },
        400,
      ),
    } as const;
  }

  return { data: parsed.data } as const;
}

export function readParams<T>(context: Context, schema: ZodType<T>) {
  const parsed = schema.safeParse(context.req.param());

  if (!parsed.success) {
    return {
      error: context.json(
        { error: 'invalid_request', issues: z.treeifyError(parsed.error) },
        400,
      ),
    } as const;
  }

  return { data: parsed.data } as const;
}
