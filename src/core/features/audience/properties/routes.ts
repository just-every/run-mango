import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import {PropertyError} from './types';
import {propertyDefinitions,readPropertyFields,propertyPersonalisation} from './read';
import {definitionInput,definitionUsage,saveDefinition,deleteDefinition,propertyLimit} from './definitions';
import {editContactProperties} from './write';
import {contactPersonalisation} from '../contact-personalisation';
const values=z.object({fields:z.record(z.string().min(1).max(100),z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.array(z.string().max(160)).max(100),z.null()])).refine(f=>Object.keys(f).length<=100)}).strict();
export function createPropertyRoutes(db:D1Database) {
  const routes=new Hono<{Variables:AuthVariables}>();
  routes.onError((error,c)=>error instanceof PropertyError?c.json({error:error.code,property:error.key},error.status):c.json({error:'property_operation_failed'},500));
  routes.get('/contact-properties',async c=>c.json({definitions:await propertyDefinitions(db),limit:propertyLimit}));
  routes.get('/settings/properties',async c=>{
    const definitions=await propertyDefinitions(db);
    return c.json({limit:propertyLimit,definitions:await Promise.all(definitions.map(async d=>({...d,...await definitionUsage(db,d)})))});
  });
  for(const method of ['post','put'] as const)routes[method]('/settings/properties',async c=>{
    const parsed=definitionInput.safeParse(await c.req.json().catch(()=>null));
    if(!parsed.success)return c.json({error:'property_definition_invalid'},400);
    return c.json({definition:await saveDefinition(db,parsed.data,method==='put')},method==='post'?201:200);
  });
  routes.delete('/settings/properties/:key',async c=>{await deleteDefinition(db,c.req.param('key'));return c.json({kind:'deleted'});});
  routes.put('/contacts/:id/properties',async c=>{
    const parsed=values.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:'property_values_invalid'},400);
    const operator=c.get('operator');await editContactProperties(db,c.req.param('id'),parsed.data.fields,{kind:'operator',label:operator.displayName||operator.email,reference:operator.id});
    return c.json({fields:await readPropertyFields(db,c.req.param('id'))});
  });
  routes.get('/contacts/:id/personalisation',async c=>{
    const contact=await db.prepare('SELECT display_name displayName,email FROM contacts WHERE id=?').bind(c.req.param('id')).first<{displayName:string;email:string}>();
    if(!contact)return c.json({error:'contact_not_found'},404);
    return c.json({values:{...propertyPersonalisation(await propertyDefinitions(db),await readPropertyFields(db,c.req.param('id'))),...contactPersonalisation(contact,contact.email??'')}});
  });
  return routes;
}
