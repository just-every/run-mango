export type AttributionPolicy = {
  policy: 'campaign.attribution.v1'; metric: string; metricLabel: string;
  clickWindowDays: {email: number; sms: number};
};
export const defaultAttributionPolicy: AttributionPolicy = {
  policy: 'campaign.attribution.v1', metric: 'placed-order', metricLabel: 'Placed Order', clickWindowDays: {email: 7, sms: 7},
};

export async function attributionPolicy(db: D1Database): Promise<AttributionPolicy> {
  const row = await db.prepare('SELECT metric,email_window_days,sms_window_days FROM campaign_attribution_policy WHERE id=1')
    .first<{metric: string; email_window_days: number; sms_window_days: number}>();
  return row ? {policy: 'campaign.attribution.v1', metric: row.metric,
    metricLabel: row.metric === 'placed-order' ? 'Placed Order' : row.metric.slice(7),
    clickWindowDays: {email: row.email_window_days, sms: row.sms_window_days}} : defaultAttributionPolicy;
}
export async function attributionMetrics(db: D1Database) {
  const rows = await db.prepare(`SELECT DISTINCT json_extract(payload,'$.metric') metric FROM source_records
    WHERE source_type='conversion-event' AND json_extract(payload,'$.schema')='native-conversion-v1'
      AND json_extract(payload,'$.kind')='conversion' ORDER BY metric`).all<{metric: string}>();
  return [{id: 'placed-order', label: 'Placed Order'}, ...rows.results.map(row => ({id: `custom:${row.metric}`, label: row.metric}))];
}
