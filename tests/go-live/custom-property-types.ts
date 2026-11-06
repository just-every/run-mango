import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {capturePropertyScreen} from './custom-property-proof';
import {json,type Installation} from './harness';

/** Native definitions, persisted values and refusal atomicity for the other four types. */
export async function provePropertyTypes(site:Installation,cookie:string,page:Page,info:TestInfo,contactId:string) {
  const textKey='synthetic_mango_1420_text',numberKey='synthetic_mango_1421_number';
  const booleanKey='synthetic_mango_1422_boolean',listKey='synthetic_mango_1423_list';
  const choices=['synthetic-mango-1424','synthetic-mango-1425','synthetic-mango-1426'];
  const definitions=[
    {key:textKey,label:'synthetic-mango-1420 text',type:'text',options:[]},
    {key:numberKey,label:'synthetic-mango-1421 number',type:'number',options:[]},
    {key:booleanKey,label:'synthetic-mango-1422 boolean',type:'boolean',options:[]},
    {key:listKey,label:'synthetic-mango-1423 list',type:'list',options:choices},
  ];
  const profile=async()=>json(await site.call('/api/contacts/'+contactId,{cookie}),200);
  const permissionState=async()=>({
    contacts:await site.rows(`SELECT id,email_status,sms_status FROM contacts WHERE id='${contactId}'`),
    addresses:await site.rows(`SELECT * FROM contact_email_addresses WHERE contact_id='${contactId}' ORDER BY id`),
    phones:await site.rows(`SELECT * FROM contact_phones WHERE contact_id='${contactId}' ORDER BY id`),
    consent:await site.rows(`SELECT * FROM consent_evidence WHERE contact_id='${contactId}' ORDER BY id`),
  });
  const permissionBefore=await permissionState(),priorProperties=(await profile()).profile.properties;
  for(const definition of definitions)expect(await json(await site.call('/api/settings/properties',{method:'POST',cookie,body:definition}),201)).toEqual({definition});
  const inventory=await json(await site.call('/api/contact-properties',{cookie}),200);
  for(const definition of definitions)expect(inventory.definitions).toContainEqual(definition);
  const write=(fields:Record<string,unknown>)=>site.call('/api/contacts/'+contactId+'/properties',{method:'PUT',cookie,body:{fields}});
  const initial={[textKey]:'synthetic-mango-1427',[numberKey]:12.5,[booleanKey]:true,[listKey]:[choices[0]]};
  expect((await json(await write(initial),200)).fields).toMatchObject({...priorProperties,...initial});
  expect((await profile()).profile.properties).toMatchObject({...priorProperties,...initial});
  const stored=await site.rows(`SELECT fields_json FROM integration_contact_profiles WHERE contact_id='${contactId}'`);
  expect(JSON.parse(stored[0].fields_json)).toMatchObject(initial);

  await page.setViewportSize({width:1440,height:1000});
  await openPage(page,site.runtime.url+'/app/audience/'+contactId);
  const panel=page.getByRole('region',{name:'Contact properties'});
  await panel.getByRole('button',{name:'Edit properties',exact:true}).click();
  const text=panel.getByLabel(definitions[0].label,{exact:true}),number=panel.getByRole('spinbutton',{name:definitions[1].label,exact:true});
  const boolean=panel.getByRole('combobox',{name:definitions[2].label,exact:true}),list=panel.getByRole('listbox',{name:definitions[3].label,exact:true});
  await expect(text).toHaveValue(initial[textKey]);await expect(number).toHaveValue('12.5');
  await expect(boolean).toHaveValue('true');await expect(list).toHaveValues([choices[0]]);
  await text.fill('synthetic-mango-1428');await number.fill('-7.25');
  await boolean.selectOption('false');await list.selectOption([choices[2],choices[1]]);
  // Record the actual controls at each width and operate the phone selects too.
  await capturePropertyScreen(page,info,'typed-controls',panel);
  await page.setViewportSize({width:390,height:1000});
  await boolean.selectOption('false');await list.selectOption([choices[1],choices[2]]);
  const savedResponse=page.waitForResponse(response=>response.url().endsWith('/api/contacts/'+contactId+'/properties')&&response.request().method()==='PUT');
  await panel.getByRole('button',{name:'Save properties',exact:true}).click();
  const edited={[textKey]:'synthetic-mango-1428',[numberKey]:-7.25,[booleanKey]:false,[listKey]:[choices[1],choices[2]]};
  const saved=await savedResponse;expect(saved.status()).toBe(200);
  expect((await saved.json()).fields).toMatchObject({...priorProperties,...edited});
  await page.setViewportSize({width:1440,height:1000});
  await openPage(page,site.runtime.url+'/app/audience/'+contactId);
  await expect(panel).toContainText('synthetic-mango-1428');await expect(panel).toContainText('-7.25');
  const displayed=(label:string)=>panel.locator('dl > div').filter({has:page.getByText(label,{exact:true})}).locator('dd');
  await expect(displayed(definitions[2].label)).toHaveText('false');
  await expect(displayed(definitions[3].label)).toHaveText(choices[1]+'; '+choices[2]);
  await panel.getByRole('button',{name:'Edit properties',exact:true}).click();
  await expect(text).toHaveValue(edited[textKey]);await expect(number).toHaveValue('-7.25');
  await expect(boolean).toHaveValue('false');await expect(list).toHaveValues([choices[1],choices[2]]);
  await panel.getByRole('button',{name:'Cancel property changes',exact:true}).click();
  await capturePropertyScreen(page,info,'typed-readback',panel);
  const beforeRefusals=await profile();
  const storedBeforeRefusals=await site.rows(`SELECT fields_json FROM integration_contact_profiles WHERE contact_id='${contactId}'`);
  expect(beforeRefusals.profile.properties).toMatchObject({...priorProperties,...edited});
  expect(JSON.parse((await site.rows(`SELECT fields_json FROM integration_contact_profiles WHERE contact_id='${contactId}'`))[0].fields_json)).toMatchObject(edited);
  expect(await permissionState()).toEqual(permissionBefore);
  const invalidValues:[string,unknown,string][]=[
    [numberKey,'12.5','property_invalid_number'],[numberKey,true,'property_invalid_number'],
    [booleanKey,'false','property_invalid_boolean'],[booleanKey,0,'property_invalid_boolean'],
    [listKey,[choices[0],'synthetic-mango-1429'],'property_invalid_list'],
  ];
  for(const [key,value,error] of invalidValues){
    const fields={...edited,[textKey]:'synthetic-mango-1430',[numberKey]:99,[booleanKey]:true,[listKey]:[choices[0]],[key]:value};
    expect(await json(await write(fields),400)).toEqual({error,property:key});
    const refused=await profile();
    expect(refused.profile.properties).toEqual(beforeRefusals.profile.properties);
    expect(refused.history).toEqual(beforeRefusals.history);
    expect(await site.rows(`SELECT fields_json FROM integration_contact_profiles WHERE contact_id='${contactId}'`)).toEqual(storedBeforeRefusals);
    expect(await permissionState()).toEqual(permissionBefore);
  }
}
