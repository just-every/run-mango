export { createAudiencePublicRoutes } from './public-routes';
export { createCommerceWebhookRoutes } from './commerce-webhook-routes';
export { createLifecycleAudience } from './lifecycle-adapter';
export { createAudienceRepository } from './repository';
export { createAudienceRoutes } from './routes';
export {
  createAudienceService,
  type AudienceDependencies,
  type Channel,
  type CommerceWebhookEvent,
  type ConsentCapture,
  type SmsComplianceReply,
} from './service';
