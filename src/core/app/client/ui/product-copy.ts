const names: Record<string, string> = {'ai.provider.v1':'AI writing', 'commerce.store.v1':'Store connection', 'design.provider.v1':'Email design', 'mail.sender.v1':'Email sending', 'sms.sender.v1':'Text messages'};
export function capabilityName(adapter: string) {return names[adapter] ?? 'Service connection';}
export function plainServiceText(value: string) {return value.replace(/(?:ai\.provider|commerce\.store|design\.provider|mail\.sender|sms\.sender)\.v1(?:\.[a-z-]+)*/g, id => names[Object.keys(names).find(key => id.startsWith(key)) ?? ''] ?? 'Service connection').replace(/proposal_[a-z0-9_]+/g, 'campaign suggestion').replace(/task-[a-z-]+/g, 'sync run').replace(/\bSms\b/g, 'SMS');}
export function capabilityNextStep(adapter: string) {
  if (adapter.startsWith('mail.')) return 'Deploy Mango with a mail provider to send email; the install guide shows how.';
  if (adapter.startsWith('commerce.')) return 'Connect your store using the operations guide, then sync its records here.';
  if (adapter.startsWith('sms.')) return 'Enable text messages and configure a sending service in the operations guide.';
  return 'Configure AI writing in the operations guide to generate campaign suggestions.';
}
const providers: Record<string, string> = {shopify: 'Shopify', woocommerce: 'WooCommerce', stripe: 'Stripe', sendgrid: 'SendGrid', resend: 'Resend', twilio: 'Twilio'};
export function providerName(provider: string) {return providers[provider] ?? plainServiceText(provider.charAt(0).toUpperCase() + provider.slice(1));}
