/** A signed provider delivery whose record the commerce adapter could not read.
 * Its route records one failed operation per delivery and keeps its answer. */
export class CommerceWebhookUnreadable extends Error {
  constructor(message: string, readonly deliveryKey: string, readonly sourceType: string) { super(message); }
}
