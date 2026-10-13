import { readFile } from 'node:fs/promises';
import { attachPublicTiming } from './public-timing.mjs';
const [directory, receiptPath, ...extra] = process.argv.slice(2);
if (!directory || !receiptPath || extra.length) throw new Error('Usage: node scripts/verification/attach-public-timing.mjs REPORT_DIRECTORY OUTER_RECEIPT.json');
await attachPublicTiming(directory, JSON.parse(await readFile(receiptPath, 'utf8')));
