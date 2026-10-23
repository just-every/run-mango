import {createSegmentFacts} from './segment-facts';
import {listGrowthEvents} from '@/core/features/insights/schema';
import {recipientOptOutSql, recipientSuppressionSql} from './public-resubscribe-policy';
import { followupMember } from './followup-membership';
import { consentCaptureMetadata } from './consent-metadata';
import { createSuppressionWriter } from './suppression-writer';
import { createPublicCaptureWriter } from './public-capture-writer';
import { createConfirmationHandoff } from './confirmation-handoff';
import { claimPortableRestrictions, recordPortableHash } from './portable-hashes';
import { fencedInsert, syncWritePredicate, type SyncWriteFence } from '@/core/features/store/sync-write-fence';
import { and, asc, desc, eq, inArray, lt, lte, or, sql } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';

import {
  contactBounceStates,
  contactBounceFacts,
  contactEmailAddresses,
  contactHistory,
  contactImportRows,
  contactMerges,
  contactPhones,
  contacts,
  consentConfirmations,
  consentEvidence,
  contactSuppressions,
  publicActionTokens,
  publicTokenRateLimits,
  smsComplianceReplies,
  survivingOptOuts,
} from './schema';

type Channel = 'email' | 'sms';

export function createAudienceRepository(database: Database) {
  async function contactForEmail(email: string) {
    const address = await database.select().from(contactEmailAddresses).where(eq(contactEmailAddresses.email, email));
    if (address[0]) return database.select().from(contacts).where(eq(contacts.id, address[0].contactId)).then((rows) => rows[0]);
    return database.select().from(contacts).where(eq(contacts.email, email)).then((rows) => rows[0]);
  }

  async function contactForPhone(phone: string) {
    const address = await database.select().from(contactPhones).where(eq(contactPhones.phoneE164, phone));
    if (!address[0]) return undefined;
    return database.select().from(contacts).where(eq(contacts.id, address[0].contactId)).then((rows) => rows[0]);
  }

  async function setChannelStatus(contactId: string, channel: Channel, status: string, occurredAt: Date) {
    const statusColumn = channel === 'email' ? contacts.emailStatus : contacts.smsStatus;
    const statusAtColumn = channel === 'email' ? contacts.emailStatusAt : contacts.smsStatusAt;
    const fields = channel === 'email'
      ? { emailStatus: status, emailStatusAt: occurredAt, updatedAt: occurredAt }
      : { smsStatus: status, smsStatusAt: occurredAt, updatedAt: occurredAt };
    if (status === 'suppressed') {
      await database.update(contacts).set(fields).where(eq(contacts.id, contactId));
      return;
    }
    if (status === 'unsubscribed') {
      await database.update(contacts).set(fields).where(and(
        eq(contacts.id, contactId),
        sql`${statusColumn} != 'suppressed'`,
        or(sql`${statusAtColumn} IS NULL`, lte(statusAtColumn, occurredAt)),
      ));
      return;
    }
    await database.update(contacts).set(fields).where(and(eq(contacts.id, contactId),
      sql`${statusColumn} != 'suppressed'`, or(sql`${statusColumn} != 'unsubscribed'`, lt(statusAtColumn, occurredAt))));
  }

  return {
    ...createSegmentFacts(database.$client),
    capturePublicSignupAtomic: createPublicCaptureWriter(database),
    async recordPhoneLocation(phone:string,timeZone:string,source:string,at:Date){await database.update(contactPhones).set({timeZone,locationSource:source,locationRecordedAt:at}).where(eq(contactPhones.phoneE164,phone));},
    claimConfirmationHandoff: createConfirmationHandoff(database),
    async followupExists(cohort:string){return Boolean(await database.$client.prepare('SELECT id FROM campaign_followups WHERE id=?').bind(cohort).first());},
    followupMember:(cohort:string,contactId:string)=>followupMember(database.$client,cohort,contactId),
    listContacts() {
      return database.select().from(contacts).orderBy(asc(contacts.displayName));
    },

    searchContacts(address: string) {
      return database.select().from(contacts).where(sql`EXISTS (SELECT 1 FROM contact_email_addresses a WHERE a.contact_id = ${contacts.id} AND instr(lower(a.email), ${address.toLowerCase()}) > 0) OR EXISTS (SELECT 1 FROM contact_phones p WHERE p.contact_id=${contacts.id} AND instr(p.phone_e164, ${address.replace(/[\s().-]/g,'')})>0)`).orderBy(asc(contacts.displayName)).limit(30);
    },

    getContact(id: string) {
      return database.select().from(contacts).where(eq(contacts.id, id)).then((rows) => rows[0]);
    },

    findMerge(id: string) {
      return database.select().from(contactMerges).where(eq(contactMerges.mergedContactId,id)).then(rows=>rows[0]);
    },
    findContactByEmail: contactForEmail,
    findContactByPhone: contactForPhone,

    async createContact(values: typeof contacts.$inferInsert, fence?: SyncWriteFence) {
      if (fence) {
        await fencedInsert(database, contacts, values, fence);
        return (await database.select().from(contacts).where(eq(contacts.id, values.id)))[0];
      }
      const rows = await database.insert(contacts).values(values).returning();
      return rows[0];
    },

    async updateContact(id: string, values: Partial<typeof contacts.$inferInsert>, fence?: SyncWriteFence) {
      const rows = await database.update(contacts).set(values).where(and(eq(contacts.id, id), fence ? syncWritePredicate(fence) : undefined)).returning();
      return rows[0];
    },

    async addEmail(values: typeof contactEmailAddresses.$inferInsert, fence?: SyncWriteFence) {
      if (fence) await fencedInsert(database, contactEmailAddresses, values, fence, {target: [], update: []});
      else await database.insert(contactEmailAddresses).values(values).onConflictDoNothing();
      return contactForEmail(values.email);
    },

    async addPhone(values: typeof contactPhones.$inferInsert, fence?: SyncWriteFence) {
      if (fence) await fencedInsert(database, contactPhones, values, fence, {target: [], update: []});
      else await database.insert(contactPhones).values(values).onConflictDoNothing();
      return contactForPhone(values.phoneE164);
    },

    listEmails(contactId: string) {
      return database.select().from(contactEmailAddresses).where(eq(contactEmailAddresses.contactId, contactId));
    },

    listPhones(contactId: string) {
      return database.select().from(contactPhones).where(eq(contactPhones.contactId, contactId));
    },

    async destinationStatus(channel: Channel, destination: string) {
      if (channel === 'email') return database.select().from(contactEmailAddresses).where(eq(contactEmailAddresses.email, destination)).then((rows) => rows[0]);
      return database.select().from(contactPhones).where(eq(contactPhones.phoneE164, destination)).then((rows) => rows[0]);
    },

    async setDestinationStatus(channel: Channel, destination: string, status: string, occurredAt: Date) {
      const address = channel === 'email' ? contactEmailAddresses : contactPhones;
      const identity = channel === 'email' ? contactEmailAddresses.email : contactPhones.phoneE164;
      const changed = await database.update(address).set({channelStatus: status, channelStatusAt: occurredAt, updatedAt: occurredAt})
        .where(and(eq(identity, destination), sql`${address.channelStatus} != 'suppressed'`,
          sql`(${address.channelStatus} != 'unsubscribed' OR ${address.channelStatusAt}<${occurredAt.getTime()} OR ${status}='suppressed')`)).returning();
      if (changed[0]) await setChannelStatus(changed[0].contactId, channel, status, occurredAt);
      return this.destinationStatus(channel, destination);
    },

    async importLocalDemoContact(values: typeof contacts.$inferInsert) {
      await database.insert(contacts).values(values).onConflictDoNothing();
      if (values.email) {
        await database.insert(contactEmailAddresses).values({
          id: `${values.id}_email`,
          contactId: values.id,
          email: values.email,
          channelStatus: values.emailStatus,
          channelStatusAt: values.emailStatusAt,
          createdAt: values.createdAt,
          updatedAt: values.updatedAt,
        }).onConflictDoNothing();
      }
    },

    async importLocalDemoHistory(values: typeof contactHistory.$inferInsert) {
      await database.insert(contactHistory).values(values).onConflictDoNothing();
    },

    listContactsById(ids: string[]) {
      if (!ids.length) return Promise.resolve([]);
      return database.select().from(contacts).where(inArray(contacts.id, ids)).orderBy(asc(contacts.displayName));
    },

    listHistory(contactId: string) {
      return database
        .select()
        .from(contactHistory)
        .where(eq(contactHistory.contactId, contactId))
        .orderBy(desc(contactHistory.occurredAt));
    },

    async recordHistory(values: typeof contactHistory.$inferInsert) {
      await database.insert(contactHistory).values(values).onConflictDoNothing();
    },

    async recordConsentCaptureIp(id: string, contactId: string, ip: string, now: Date) {
      await database.run(sql`INSERT INTO consent_capture_metadata(id,contact_id,capture_ip,confirmation_ip,created_at,updated_at) VALUES(${id},${contactId},${ip},NULL,${now.getTime()},${now.getTime()}) ON CONFLICT(id) DO NOTHING`);
    },

    async recordConsent(values: typeof consentEvidence.$inferInsert) {
      await database.insert(consentEvidence).values(values).onConflictDoNothing();
      return database.select().from(consentEvidence).where(eq(consentEvidence.id, values.id)).then((rows) => rows[0]);
    },

    getConsent(id: string) {
      return database.select().from(consentEvidence).where(eq(consentEvidence.id, id)).then((rows) => rows[0]);
    },

    async sourceGeneration() {
      const row=await database.$client.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first<{generation:number}>();
      if(!row) throw new Error('Audience source authority is missing.');
      return row.generation;
    },

    async lastQualifyingActivity(contactId: string, now: Date) {
      const row = await database.$client.prepare(`SELECT MAX(at) at FROM (
        SELECT confirmed_at at FROM consent_evidence WHERE contact_id=? AND confirmed_at<=?
        UNION ALL SELECT occurred_at FROM contact_history WHERE contact_id=? AND kind IN ('consent-captured','consent-confirmed','opt-out') AND occurred_at<=?
        UNION ALL SELECT c.occurred_at FROM link_click_facts c JOIN recipient_steps r ON r.id=c.recipient_step_id WHERE r.contact_id=? AND c.automated=0 AND c.occurred_at<=?
        UNION ALL SELECT f.occurred_at FROM imported_engagement_facts f JOIN move_in_archives a ON a.id=f.archive_id WHERE f.contact_id=? AND f.kind='click' AND f.occurred_at<=? AND a.state='applied'
        UNION ALL SELECT purchased_at FROM commerce_orders WHERE contact_id=? AND qualifying=1 AND purchased_at<=?
      )`).bind(contactId,now.getTime(),contactId,now.getTime(),contactId,now.getTime(),contactId,now.getTime(),contactId,now.getTime()).first<{at:number|null}>();
      return row?.at == null ? undefined : new Date(row.at);
    },

    async importedHistoryWindow(contactId:string,now:Date,cutoff:number) {
      const coverage=await database.$client.prepare(`SELECT min(a.applied_at) started, max(h.has_history) hasHistory FROM move_in_contact_history h JOIN move_in_archives a ON a.id=h.archive_id WHERE h.contact_id=? AND a.state='applied' AND a.applied_at<=?`)
        .bind(contactId,now.getTime()).first<{started:number|null;hasHistory:number|null}>();
      const opens=await database.$client.prepare(`SELECT 1 FROM imported_engagement_facts f JOIN move_in_archives a ON a.id=f.archive_id WHERE f.contact_id=? AND a.state='applied' AND f.kind='open' AND f.occurred_at>=? AND f.occurred_at<=? LIMIT 1`)
        .bind(contactId,cutoff,now.getTime()).first();
      return {noHistory:coverage?.started!=null&&!coverage.hasHistory&&coverage.started>cutoff,importedOpens:Boolean(opens)};
    },

    async listConsent(contactId: string) {
      const [evidence,links]=await Promise.all([
        database.select().from(consentEvidence).where(eq(consentEvidence.contactId, contactId)).orderBy(desc(consentEvidence.occurredAt)),
        database.$client.prepare('SELECT l.id,l.attestation_id,l.evidence_at,l.time_quality,a.revoked_at FROM incumbent_consent_links l JOIN consent_attestations a ON a.id=l.attestation_id WHERE l.contact_id=?').bind(contactId).all<{id:string;attestation_id:string;evidence_at:number;time_quality:string;revoked_at:number|null}>(),
      ]);
      return evidence.map(row=>{const link=links.results.find(link=>link.id===row.id);return {...row,attestationId:link?.attestation_id,evidenceKind:link?'incumbent-held':undefined,timeQuality:link?.time_quality,incumbentAt:link&&link.revoked_at===null?new Date(link.evidence_at):undefined};});
    },

    async createConfirmation(values: typeof consentConfirmations.$inferInsert) {
      await database.insert(consentConfirmations).values(values);
    },

    getConfirmationByTokenDigest(tokenDigest: string) {
      return database
        .select()
        .from(consentConfirmations)
        .where(eq(consentConfirmations.tokenDigest, tokenDigest))
        .then((rows) => rows[0]);
    },

    getConfirmationByConsentEvidenceId(consentEvidenceId: string) {
      return database
        .select()
        .from(consentConfirmations)
        .where(eq(consentConfirmations.consentEvidenceId, consentEvidenceId))
        .then((rows) => rows[0]);
    },

    async confirmConsentAtomic(confirmation: typeof consentConfirmations.$inferSelect, evidence: typeof consentEvidence.$inferSelect, destinationHash: string, now: Date, confirmationIp?: string) {
      const email = confirmation.channel === 'email';
      const status = email ? contacts.emailStatus : contacts.smsStatus;
      const statusAt = email ? contacts.emailStatusAt : contacts.smsStatusAt;
      const publicResubscribe = sql`EXISTS(SELECT 1 FROM contact_history WHERE id=${`${evidence.id}_resubscribe`} AND kind='resubscribe-request')`;
      const resolvedSuppression = sql`(${publicResubscribe} AND EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=${destinationHash} AND channel=${confirmation.channel} AND ${sql.raw(recipientSuppressionSql)}) AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=${destinationHash} AND channel=${confirmation.channel} AND NOT (${sql.raw(recipientSuppressionSql)})))`;
      const eligible = sql`EXISTS (SELECT 1 FROM consent_confirmations WHERE id=${confirmation.id} AND confirmed_at IS NULL AND expires_at>${now.getTime()})
        AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=${destinationHash} AND channel=${confirmation.channel} AND occurred_at>=${evidence.occurredAt.getTime()})
        AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=${destinationHash} AND channel=${confirmation.channel} AND NOT (${publicResubscribe} AND ${sql.raw(recipientSuppressionSql)}))
        AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=${destinationHash} AND channel=${confirmation.channel} AND ${publicResubscribe} AND NOT (${sql.raw(recipientOptOutSql)}))
        AND EXISTS(SELECT 1 FROM contacts WHERE id=${confirmation.contactId} AND merge_lock IS NULL
          AND (${status} != 'suppressed' OR ${resolvedSuppression}) AND (${status} != 'unsubscribed' OR ${statusAt}<${evidence.occurredAt.getTime()}))
        AND EXISTS(SELECT 1 FROM ${email ? contactEmailAddresses : contactPhones}
          WHERE contact_id=${confirmation.contactId}
          AND ${email ? contactEmailAddresses.email : contactPhones.phoneE164}=${evidence.destination}
          AND (channel_status != 'suppressed' OR ${resolvedSuppression}) AND (channel_status != 'unsubscribed' OR channel_status_at<${evidence.occurredAt.getTime()}))`;
      const address = email ? contactEmailAddresses : contactPhones;
      const destination = email ? contactEmailAddresses.email : contactPhones.phoneE164;
      const results = await database.batch([
        database.update(contacts).set(email ? {emailStatus:'subscribed',emailStatusAt:now,updatedAt:now} : {smsStatus:'subscribed',smsStatusAt:now,updatedAt:now})
          .where(and(eq(contacts.id,confirmation.contactId), sql`(${status} != 'suppressed' OR ${resolvedSuppression})`, or(sql`${status} != 'unsubscribed'`,lt(statusAt,evidence.occurredAt)), eligible)).returning(),
        database.update(address).set({channelStatus:'subscribed',channelStatusAt:now,updatedAt:now})
          .where(and(eq(destination,evidence.destination),eq(address.contactId,confirmation.contactId),sql`(${address.channelStatus} != 'suppressed' OR ${resolvedSuppression})`,or(sql`${address.channelStatus} != 'unsubscribed'`,lt(address.channelStatusAt,evidence.occurredAt)),eligible)),
        database.update(consentEvidence).set({confirmedAt:now,updatedAt:now}).where(and(eq(consentEvidence.id,evidence.id),eligible)),
        database.update(consentCaptureMetadata).set({confirmationIp:confirmationIp ?? null,updatedAt:now}).where(and(eq(consentCaptureMetadata.id,evidence.id),eligible)),
        database.update(listGrowthEvents).set({kind:'resubscribe'}).where(and(eq(listGrowthEvents.kind,'subscription'),eligible,publicResubscribe,
          sql`${listGrowthEvents.id} IN (SELECT event_id FROM list_growth_attribution WHERE contact_id=${confirmation.contactId} AND evidence_id=${evidence.id})`)),
        database.insert(contactHistory).select(sql`SELECT ${`${evidence.id}_confirmed`},${confirmation.contactId},'consent-confirmed',${`${confirmation.channel} confirmation completed.`},${now.getTime()},${now.getTime()},${now.getTime()} WHERE ${eligible}`).onConflictDoNothing(),
        database.insert(contactHistory).select(sql`SELECT ${`${evidence.id}_resubscribed`},${confirmation.contactId},'resubscribed',${`${confirmation.channel} subscription restored by the recipient's confirmation.`},${now.getTime()},${now.getTime()},${now.getTime()} WHERE ${eligible} AND ${publicResubscribe}`).onConflictDoNothing(),
        database.update(consentConfirmations).set({confirmedAt:now,updatedAt:now}).where(and(eq(consentConfirmations.id,confirmation.id),eligible)),
        database.delete(contactSuppressions).where(and(eq(contactSuppressions.destinationHash,destinationHash),eq(contactSuppressions.channel,confirmation.channel),sql.raw(recipientSuppressionSql),publicResubscribe,sql`EXISTS(SELECT 1 FROM consent_confirmations WHERE id=${confirmation.id} AND confirmed_at=${now.getTime()})`)),
      ]);
      return results[0][0];
    },

    async subscribeFromConfirmedEvidence(contactId: string, channel: Channel, evidenceOccurredAt: Date, confirmedAt: Date) {
      const statusColumn = channel === 'email' ? contacts.emailStatus : contacts.smsStatus;
      const statusAtColumn = channel === 'email' ? contacts.emailStatusAt : contacts.smsStatusAt;
      const set = channel === 'email'
        ? { emailStatus: 'subscribed', emailStatusAt: confirmedAt, updatedAt: confirmedAt }
        : { smsStatus: 'subscribed', smsStatusAt: confirmedAt, updatedAt: confirmedAt };
      const rows = await database
        .update(contacts)
        .set(set)
        .where(and(
          eq(contacts.id, contactId),
          sql`${statusColumn} != 'suppressed'`,
          or(sql`${statusColumn} != 'unsubscribed'`, lt(statusAtColumn, evidenceOccurredAt)),
        ))
        .returning();
      return rows[0];
    },

    async setPendingFromEvidence(contactId: string, channel: Channel, occurredAt: Date) {
      const statusColumn = channel === 'email' ? contacts.emailStatus : contacts.smsStatus;
      const statusAt = channel === 'email' ? contacts.emailStatusAt : contacts.smsStatusAt;
      const set = channel === 'email'
        ? { emailStatus: 'pending', emailStatusAt: occurredAt, updatedAt: occurredAt }
        : { smsStatus: 'pending', smsStatusAt: occurredAt, updatedAt: occurredAt };
      await database.update(contacts).set(set).where(and(
        eq(contacts.id, contactId),
        sql`${statusColumn} != 'suppressed'`,
        or(sql`${statusColumn} != 'unsubscribed'`, lt(statusAt, occurredAt)),
      ));
    },

    setChannelStatus,

    recordProviderSuppressionAtomic: createSuppressionWriter(database),

    async listDestinationOptOuts(destinationHash: string, channel: Channel) {
      return database.select().from(survivingOptOuts).where(and(eq(survivingOptOuts.destinationHash,destinationHash),eq(survivingOptOuts.channel,channel)));
    },

    async hasDestinationSuppression(destinationHash: string, channel: Channel) {
      return Boolean((await database.select({id: contactSuppressions.id}).from(contactSuppressions)
        .where(and(eq(contactSuppressions.destinationHash, destinationHash), eq(contactSuppressions.channel, channel))).limit(1))[0]);
    },

    listDestinationSuppressions(destinationHashes: string[]) {
      return destinationHashes.length ? database.select().from(contactSuppressions).where(inArray(contactSuppressions.destinationHash, destinationHashes)) : Promise.resolve([]);
    },

    listSuppressions(contactId: string) {
      return database.select().from(contactSuppressions).where(eq(contactSuppressions.contactId, contactId)).orderBy(desc(contactSuppressions.occurredAt));
    },

    getSurvivingOptOut(destinationHash: string, channel: Channel) {
      return database
        .select()
        .from(survivingOptOuts)
        .where(and(eq(survivingOptOuts.destinationHash, destinationHash), eq(survivingOptOuts.channel, channel)))
        .orderBy(desc(survivingOptOuts.occurredAt)).limit(1)
        .then((rows) => rows[0]);
    },

    /** A restored opt-out still named by its portable identity covers an address as it arrives. */
    claimPortableRestrictions: (salt: string, destinations: string[]) => claimPortableRestrictions(database.$client, salt, destinations),

    async upsertSurvivingOptOut(values: typeof survivingOptOuts.$inferInsert, destination: string) {
      await recordPortableHash(database.$client, values.destinationHash, destination).run();
      await database.insert(survivingOptOuts).values(values).onConflictDoUpdate({
        target: [survivingOptOuts.destinationHash, survivingOptOuts.channel, survivingOptOuts.reason],
        set: { occurredAt: values.occurredAt, updatedAt: values.updatedAt },
        where: lte(survivingOptOuts.occurredAt, values.occurredAt),
      });
    },

    async incrementSoftBounce(contactId: string, occurredAt: Date) {
      const current = await database.select().from(contactBounceStates).where(eq(contactBounceStates.contactId, contactId)).then((rows) => rows[0]);
      const count = (current?.consecutiveSoftBounces ?? 0) + 1;
      await database.insert(contactBounceStates).values({ contactId, consecutiveSoftBounces: count, updatedAt: occurredAt }).onConflictDoUpdate({
        target: contactBounceStates.contactId,
        set: { consecutiveSoftBounces: count, updatedAt: occurredAt },
      });
      return count;
    },

    async resetSoftBounces(contactId: string, occurredAt: Date) {
      await database.insert(contactBounceStates).values({ contactId, consecutiveSoftBounces: 0, updatedAt: occurredAt }).onConflictDoUpdate({
        target: contactBounceStates.contactId,
        set: { consecutiveSoftBounces: 0, updatedAt: occurredAt },
      });
    },

    async setSoftBounceCount(contactId: string, count: number, occurredAt: Date) {
      await database.insert(contactBounceStates).values({ contactId, consecutiveSoftBounces: count, updatedAt: occurredAt }).onConflictDoUpdate({
        target: contactBounceStates.contactId,
        set: { consecutiveSoftBounces: count, updatedAt: occurredAt },
      });
    },

    async removeSoftBounceSuppression(contactId: string, destinationHash: string) {
      await database.delete(contactSuppressions).where(and(
        eq(contactSuppressions.contactId, contactId),
        eq(contactSuppressions.channel, 'email'),
        eq(contactSuppressions.destinationHash, destinationHash),
        eq(contactSuppressions.cause, 'three-consecutive-soft-bounces'),
      ));
    },

    async hasSuppression(destinationHash: string) {
      return database
        .select({ id: contactSuppressions.id })
        .from(contactSuppressions)
        .where(and(eq(contactSuppressions.channel, 'email'), eq(contactSuppressions.destinationHash, destinationHash)))
        .limit(1)
        .then((rows) => rows.length > 0);
    },

    async removeSurvivingOptOutForReason(destinationHash: string, channel: Channel, reason: string) {
      await database.delete(survivingOptOuts).where(and(
        eq(survivingOptOuts.destinationHash, destinationHash),
        eq(survivingOptOuts.channel, channel),
        eq(survivingOptOuts.reason, reason),
      ));
    },

    /** A lifted suppression leaves the address subscribed, or unsubscribed while an opt-out remains. */
    async settleLiftedSuppression(destination: string, status: 'subscribed' | 'unsubscribed', occurredAt: Date) {
      await database.update(contactEmailAddresses).set({
        channelStatus: status,
        channelStatusAt: occurredAt,
        updatedAt: occurredAt,
      }).where(and(
        eq(contactEmailAddresses.email, destination),
        eq(contactEmailAddresses.channelStatus, 'suppressed'),
      ));
    },

    async recordBounceFact(values: typeof contactBounceFacts.$inferInsert) {
      const rows = await database.insert(contactBounceFacts).values(values).onConflictDoNothing().returning();
      return rows[0];
    },

    listBounceFacts(contactId: string) {
      return database.select().from(contactBounceFacts).where(eq(contactBounceFacts.contactId, contactId)).orderBy(asc(contactBounceFacts.occurredAt));
    },

    async acquireMergeLocks(survivorContactId: string, mergedContactId: string, mergeLock: string, now: Date) {
      const result = await database.run(sql`
        UPDATE contacts SET merge_lock = ${mergeLock}, updated_at = ${now.getTime()}
        WHERE id IN (${survivorContactId}, ${mergedContactId})
          AND (SELECT count(*) FROM contacts WHERE id IN (${survivorContactId}, ${mergedContactId})) = 2
          AND merge_lock IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM contacts
            WHERE id IN (${survivorContactId}, ${mergedContactId}) AND merge_lock IS NOT NULL
          )
      `);
      return result.meta.changes === 2;
    },

    async releaseMergeLocks(contactIds: string[], mergeLock: string, now: Date) {
      await database.update(contacts).set({ mergeLock: null, updatedAt: now }).where(and(
        inArray(contacts.id, contactIds),
        eq(contacts.mergeLock, mergeLock),
      ));
    },

    async createPublicActionToken(values: typeof publicActionTokens.$inferInsert) {
      await database.insert(publicActionTokens).values(values);
    },

    getPublicActionToken(tokenDigest: string, purpose: string) {
      return database
        .select()
        .from(publicActionTokens)
        .where(and(eq(publicActionTokens.tokenDigest, tokenDigest), eq(publicActionTokens.purpose, purpose)))
        .then((rows) => rows[0]);
    },

    async markPublicActionUsed(id: string, usedAt: Date) {
      await database.update(publicActionTokens).set({ usedAt, updatedAt: usedAt }).where(eq(publicActionTokens.id, id));
    },

    async takePublicTokenAllowance(tokenDigest: string, now: Date) {
      const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
      await database.run(sql`
        INSERT INTO public_token_rate_limits (token_digest, window_started_at, request_count, updated_at)
        VALUES (${tokenDigest}, ${windowStart.getTime()}, 1, ${now.getTime()})
        ON CONFLICT(token_digest) DO UPDATE SET
          window_started_at = CASE WHEN public_token_rate_limits.window_started_at = ${windowStart.getTime()} THEN public_token_rate_limits.window_started_at ELSE ${windowStart.getTime()} END,
          request_count = CASE WHEN public_token_rate_limits.window_started_at = ${windowStart.getTime()} THEN public_token_rate_limits.request_count + 1 ELSE 1 END,
          updated_at = ${now.getTime()}
      `);
      return database
        .select()
        .from(publicTokenRateLimits)
        .where(eq(publicTokenRateLimits.tokenDigest, tokenDigest))
        .then((rows) => rows[0]?.requestCount ?? 0);
    },

    async recordSmsComplianceReply(values: typeof smsComplianceReplies.$inferInsert) {
      const inserted = await database.insert(smsComplianceReplies).values(values).onConflictDoNothing().returning({ id: smsComplianceReplies.id });
      return inserted.length > 0;
    },

    async moveContactData(mergedContactId: string, survivorContactId: string, occurredAt: Date, operatorId?: string) {
      const [mergedEmails, mergedPhones] = await Promise.all([this.listEmails(mergedContactId), this.listPhones(mergedContactId)]);
      for (const email of mergedEmails) {
        await database.update(contactEmailAddresses).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(contactEmailAddresses.id, email.id));
      }
      for (const phone of mergedPhones) {
        await database.update(contactPhones).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(contactPhones.id, phone.id));
      }
      await database.$client.batch([
        database.$client.prepare(`UPDATE move_in_contact_history SET has_history=max(has_history,COALESCE((SELECT has_history FROM move_in_contact_history other WHERE other.archive_id=move_in_contact_history.archive_id AND other.contact_id=?),0)) WHERE contact_id=?`).bind(mergedContactId,survivorContactId),
        database.$client.prepare('DELETE FROM move_in_contact_history WHERE contact_id=? AND archive_id IN (SELECT archive_id FROM move_in_contact_history WHERE contact_id=?)').bind(mergedContactId,survivorContactId),
        database.$client.prepare('UPDATE move_in_contact_history SET contact_id=? WHERE contact_id=?').bind(survivorContactId,mergedContactId),
      ]);
      await Promise.all([
        database.$client.batch(['incumbent_consent_links','sms_frequency_claims','sms_service_messages','sms_inbound_receipts','consent_handoff_claims','imported_engagement_facts'].map(table=>
          database.$client.prepare(`UPDATE ${table} SET contact_id=? WHERE contact_id=?`).bind(survivorContactId,mergedContactId))),
        database.update(contactImportRows).set({contactId:survivorContactId}).where(eq(contactImportRows.contactId,mergedContactId)),
        database.update(contactBounceFacts).set({contactId:survivorContactId}).where(eq(contactBounceFacts.contactId,mergedContactId)),
        database.update(contactHistory).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(contactHistory.contactId, mergedContactId)),
        database.update(consentEvidence).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(consentEvidence.contactId, mergedContactId)),
        database.update(consentConfirmations).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(consentConfirmations.contactId, mergedContactId)),
        database.update(contactSuppressions).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(contactSuppressions.contactId, mergedContactId)),
        database.update(publicActionTokens).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(publicActionTokens.contactId, mergedContactId)),
        database.update(smsComplianceReplies).set({ contactId: survivorContactId, updatedAt: occurredAt }).where(eq(smsComplianceReplies.contactId, mergedContactId)),
      ]);
      await database.run(sql`INSERT INTO contact_bounce_states (contact_id,consecutive_soft_bounces,updated_at)
        SELECT ${survivorContactId},consecutive_soft_bounces,${occurredAt.getTime()} FROM contact_bounce_states WHERE contact_id=${mergedContactId}
        ON CONFLICT(contact_id) DO UPDATE SET consecutive_soft_bounces=max(contact_bounce_states.consecutive_soft_bounces,excluded.consecutive_soft_bounces),updated_at=excluded.updated_at`);
      await database.delete(contactBounceStates).where(eq(contactBounceStates.contactId,mergedContactId));
      await database.insert(contactMerges).values({
        id: `${mergedContactId}_merged_${occurredAt.getTime()}`,
        survivorContactId,
        mergedContactId,
        operatorId: operatorId ?? null,
        occurredAt,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });
      await database.delete(contacts).where(eq(contacts.id, mergedContactId));
    },

    async discardUnlinkedContact(contactId: string) {
      await database.delete(contactEmailAddresses).where(eq(contactEmailAddresses.contactId, contactId));
      await database.delete(contactPhones).where(eq(contactPhones.contactId, contactId));
      await database.delete(contacts).where(eq(contacts.id, contactId));
    },
  };
}
