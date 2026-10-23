import type {IncomingMessage,ServerResponse} from 'node:http';
import {installationScopes} from '../../src/core/features/store/shopify/install-security';
export function shopifyInstallEdge(){
  const subscriptions:{id:string;topic:string;uri:string;filter:null;includeFields:string[];format:string;apiVersion:{handle:string}}[]=[];
  let exchanges=0; let pixel:null|{id:string;settings:string}=null;
  return {subscriptions,get pixel(){return pixel;},get exchanges(){return exchanges;},async handle(url:URL,request:IncomingMessage,response:ServerResponse){
    if(url.hostname!=='mango-test.myshopify.com')return false;
    const json=(value:unknown)=>{response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(value));return true;};
    if(url.pathname==='/admin/oauth/access_token'){exchanges++;return json({access_token:'synthetic-mango-73',expires_in:86400,scope:installationScopes.join(',')});}
    if(url.pathname!=='/admin/api/2026-07/graphql.json')return false;
    const chunks=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));const {query,variables}=JSON.parse(Buffer.concat(chunks).toString());
    if(query.includes('MangoInstalledAccess'))return json({data:{shop:{myshopifyDomain:url.hostname},currentAppInstallation:{id:'gid://shopify/AppInstallation/1',accessScopes:installationScopes.map(handle=>({handle}))},webPixel:pixel}});
    if(query.includes('MangoCreatePixel')){pixel={id:'gid://shopify/WebPixel/2',settings:variables.pixel.settings};return json({data:{webPixelCreate:{webPixel:pixel,userErrors:[]}}});}
    if(query.includes('MangoCreateSubscription')){const created={id:`gid://shopify/WebhookSubscription/${subscriptions.length+100}`,topic:variables.topic,uri:variables.subscription.uri,filter:null,includeFields:[],format:'JSON',apiVersion:{handle:'2026-07'}};subscriptions.push(created);return json({data:{webhookSubscriptionCreate:{webhookSubscription:created,userErrors:[]}}});}
    if(query.includes('MangoSubscriptions'))return json({data:{webhookSubscriptions:{nodes:subscriptions,pageInfo:{hasNextPage:false,endCursor:null}}}});
    response.writeHead(422);response.end();return true;
  }};
}
