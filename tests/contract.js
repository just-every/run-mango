import { test as playwrightTest } from '@playwright/test';
import { test as nodeTest } from 'node:test';

export function contract(id, title, body, options = {}) {
  const name = `[${id}] ${title}`;
  if (process.env.NODE_TEST_CONTEXT) return nodeTest(name, options, body);
  return playwrightTest(name, body);
}
