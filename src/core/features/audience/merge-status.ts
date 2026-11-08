/** Read live states at the final merge transaction, after destination identities moved. */
export function settleMergeStatus(db:D1Database,survivor:string,merged:string,now:number) {
  return (['email','sms'] as const).map(channel=>{
    const table=channel==='email'?'contact_email_addresses':'contact_phones';
    return db.prepare(`WITH states AS (
      SELECT ${channel}_status AS status,${channel}_status_at AS at FROM contacts WHERE id IN (?,?)
      UNION ALL SELECT channel_status,channel_status_at FROM ${table} WHERE contact_id IN (?,?)
    ) UPDATE contacts SET ${channel}_status=(SELECT status FROM states ORDER BY CASE status
      WHEN 'suppressed' THEN 4 WHEN 'unsubscribed' THEN 3 WHEN 'non-subscribed' THEN 2 WHEN 'pending' THEN 1 ELSE 0 END DESC LIMIT 1),
      ${channel}_status_at=(SELECT MAX(at) FROM states),updated_at=? WHERE id=?`)
      .bind(survivor,merged,survivor,merged,now,survivor);
  });
}
