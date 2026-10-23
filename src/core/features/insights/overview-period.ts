import {z} from 'zod';
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value);
export const overviewQuery=z.object({from:day.optional(),to:day.optional()}).strict();
export type OverviewPeriod={from:string;to:string};
export function overviewPeriod(input:{from?:string;to?:string},now=new Date()):OverviewPeriod {
  const to=input.to??now.toISOString().slice(0,10),from=input.from??new Date(Date.parse(`${to}T00:00:00Z`)-29*86400000).toISOString().slice(0,10);
  const days=(Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000+1;
  if(!Number.isInteger(days)||days<1||days>366)throw new Error('Choose an ordered UTC range of at most 366 days.');
  return {from,to};
}
