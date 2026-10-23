import {z} from 'zod';
import {IntegrationError} from '../schema';
import type {SupportedApp} from './signatures';
const id=z.union([z.string().min(1).max(200),z.number().int().nonnegative()]).transform(String);
const email=z.string().trim().toLowerCase().email().max(320),date=z.iso.datetime({offset:true});
const judge=z.object({review:z.object({id,created_at:date,reviewer:z.object({email}),rating:z.number().int().min(1).max(5)})});
const okendo=z.object({resourceType:z.string(),topic:z.enum(['create','update']),sequenceNumber:id,resource:z.record(z.string(),z.unknown())});
const review=z.object({subscriberId:id,reviewId:id,dateCreated:date,reviewer:z.object({email}),rating:z.number().int().min(1).max(5)});
const earning=z.object({subscriberId:id,loyaltyTransactionId:id,date:date,customer:z.object({email}),status:z.literal('complete'),amount:z.number().int().positive()});
const tier=z.object({subscriberId:id,loyaltyCustomerId:id,dateTierEntered:date,customer:z.object({email}),vipTierId:id,vipTierName:z.string().min(1).max(160)});
const smile=z.object({account_id:id,topic:z.literal('customer/updated'),data:z.object({customer:z.object({id,email,updated_at:date,points_balance:z.number().int(),vip_tier:z.object({id,name:z.string().max(160)}).nullable().optional()})})});
export type AdapterFact={eventId:string;email:string;name:string;occurredAt:string;properties:Record<string,string|number|boolean|null>};
export function adapterFact(app:SupportedApp,raw:unknown,accountId:string):AdapterFact {
  try {
    if(app==='judgeme') {
      const {review:r}=judge.parse(raw);
      return {eventId:'review:'+r.id,email:r.reviewer.email,name:'review.submitted',occurredAt:r.created_at,properties:{reviewId:r.id,rating:r.rating}};
    }
    if(app==='smile') {
      const input=smile.parse(raw),c=input.data.customer;
      if(input.account_id!==accountId)throw new IntegrationError('adapter_account_mismatch',401);
      // A balance update is an observation, never evidence that points were earned.
      return {eventId:'customer:'+c.id+':'+c.updated_at,email:c.email,name:'loyalty.profile_observed',occurredAt:c.updated_at,properties:{customerId:c.id,pointsBalance:c.points_balance,tierId:c.vip_tier?.id??null,tierName:c.vip_tier?.name??null}};
    }
    const input=okendo.parse(raw),r=input.resource;
    if(String(r.subscriberId)!==accountId)throw new IntegrationError('adapter_account_mismatch',401);
    if(input.resourceType==='review'&&input.topic==='create') {
      const v=review.parse(r);return {eventId:'review:'+v.reviewId,email:v.reviewer.email,name:'review.submitted',occurredAt:v.dateCreated,properties:{reviewId:v.reviewId,rating:v.rating}};
    }
    if(input.resourceType==='loyalty_earning_transaction') {
      const v=earning.parse(r);return {eventId:'earning:'+v.loyaltyTransactionId,email:v.customer.email,name:'loyalty.points_earned',occurredAt:v.date,properties:{transactionId:v.loyaltyTransactionId,points:v.amount}};
    }
    if(input.resourceType==='loyalty_customer'&&input.topic==='update') {
      const v=tier.parse(r);return {eventId:'tier:'+v.loyaltyCustomerId+':'+v.dateTierEntered+':'+v.vipTierId,email:v.customer.email,name:'loyalty.tier_changed',occurredAt:v.dateTierEntered,properties:{customerId:v.loyaltyCustomerId,tierId:v.vipTierId,tierName:v.vipTierName}};
    }
    throw new IntegrationError('adapter_event_unsupported',400);
  } catch(error) {if(error instanceof IntegrationError)throw error;throw new IntegrationError('invalid_adapter_event',400);}
}
