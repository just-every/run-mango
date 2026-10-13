import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Existing migration 0018 owns this capture/confirmation metadata table.
export const consentCaptureMetadata = sqliteTable('consent_capture_metadata', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').notNull(),
  captureIp: text('capture_ip'),
  confirmationIp: text('confirmation_ip'),
  createdAt: integer('created_at', {mode:'timestamp_ms'}).notNull(),
  updatedAt: integer('updated_at', {mode:'timestamp_ms'}).notNull(),
});
