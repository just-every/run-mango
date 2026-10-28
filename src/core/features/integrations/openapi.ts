const string={type:'string'},object={type:'object'},date={type:'string',format:'date-time'};
const error={type:'object',required:['error'],properties:{error:string,property:string}};
const responses={
  '200':{description:'Persisted result. A repeated matching event returns replayed.',content:{'application/json':{schema:object}}},
  '400':{description:'Invalid input, consent_evidence_required, event_in_future, or property_invalid_text/number/money/date/boolean/list with the property key.',content:{'application/json':{schema:error}}},
  '401':{description:'Missing, invalid or revoked scoped key.'},'403':{description:'insufficient_scope'},
  '409':{description:'idempotency_conflict or authority changed.'},'429':{description:'Per-key minute allowance exhausted.',headers:{'Retry-After':{schema:{type:'integer'},description:'Seconds until the next minute.'}}},
  '503':{description:'Unavailable, including erasure in progress; no write is admitted.'},
};
const query=(name:string,description:string)=>({name,in:'query',description,schema:string});
const json=(schema:unknown)=>({required:true,content:{'application/json':{schema}}});
const operation=(scope:string,summary:string,extra:Record<string,unknown>={})=>({summary,security:[{scopedKey:[]}],'x-required-scope':scope,responses,...extra});
export const integrationOpenApi={
  openapi:'3.1.0',info:{title:'Mango events and profiles API',version:'1.0.0',description:'Server-held scoped keys. Writes retain key attribution and never imply marketing consent. Website clients use their own authenticated server proxy.'},
  servers:[{url:'/api/integrations/v1'}],
  components:{securitySchemes:{scopedKey:{type:'http',scheme:'bearer'}},schemas:{
    ContactPropertyValue:{description:'A defined key is validated by its saved definition. Text is a string; number is finite; USD money is an exact safe-integer minor-unit number or decimal string (optional $, grouped thousands, at most two decimal places); date is YYYY-MM-DD with no time or timezone; boolean is true/false; list is an array of saved allowed values (CSV uses semicolons). Null clears a value. Undefined keys retain scalar untyped behavior. Changing a property never changes consent.',type:['string','number','boolean','array','null'],items:{type:'string'}},
    ContactProperties:{type:'object',maxProperties:50,additionalProperties:{$ref:'#/components/schemas/ContactPropertyValue'}},
    CustomEvent:{type:'object',additionalProperties:false,required:['name','contactId','idempotencyKey','occurredAt'],properties:{
      name:{type:'string',pattern:'^[a-z][a-z0-9_.-]{0,79}$'},contactId:{type:'string',minLength:1,maxLength:160},
      idempotencyKey:{type:'string',minLength:8,maxLength:200,description:'Unique per key and fact. Reuse unchanged on retry; changed content returns 409.'},
      contactProperties:{$ref:'#/components/schemas/ContactProperties',description:'Optional contact profile changes, attributed to this scoped key. Event properties below remain event facts.'},occurredAt:date,properties:{type:'object',maxProperties:50,additionalProperties:{type:['string','number','boolean','null']},description:'Flat values, strings at most 2000 characters; complete fact at most 16 KiB.'},
    }},
    Consent:{type:'object',additionalProperties:false,required:['source','evidence','brandOrLegalSender','messageCategory','frequencyDisclosure','destinationJurisdiction','consentVersion','occurredAt'],properties:{source:string,evidence:string,brandOrLegalSender:string,messageCategory:string,frequencyDisclosure:string,destinationJurisdiction:string,consentVersion:string,occurredAt:date}},
    Profile:{type:'object',additionalProperties:false,required:['email'],description:'Exactly one of segmentId or segmentName is required. Subscribe requires full consent evidence. Suppression and prior opt-outs win.',properties:{email:{type:'string',format:'email'},displayName:string,fields:{$ref:'#/components/schemas/ContactProperties'},tags:{type:'array',items:string},segmentId:string,segmentName:string,subscribe:{type:'boolean'},consent:{$ref:'#/components/schemas/Consent'}}},
    Conversion:{type:'object',additionalProperties:false,required:['eventId','metric','contactId','occurredAt','valueMinor','currency','kind'],properties:{eventId:string,metric:string,contactId:string,occurredAt:date,valueMinor:{type:'integer',minimum:0},currency:string,kind:{enum:['conversion','refund','cancellation']},conversionId:string}},
  }},
  paths:{
    '/contacts':{
      get:operation('contacts:read','Read profiles and their integration segmentIds',{parameters:[query('email','Exact email'),query('segmentId','Integration list ID'),query('cursor','Last contact ID'),query('limit','1 to 100; default 50')]}),
      put:operation('contacts:write','Identify, update properties and optionally subscribe with evidence',{requestBody:json({$ref:'#/components/schemas/Profile'})}),
    },
    '/contacts/{id}/segments':{get:operation('contacts:read','Read current rule-derived segment membership; unavailable sources stay explicit',{parameters:[{name:'id',in:'path',required:true,schema:string}]})},
    '/segments':{get:operation('contacts:read','Read integration list identities and member counts')},
    '/events':{
      post:operation('events:write','Track a general custom event or a financial conversion for an existing contact',{requestBody:json({oneOf:[{$ref:'#/components/schemas/CustomEvent'},{$ref:'#/components/schemas/Conversion'}]})}),
      get:operation('events:read','Read unsubscribe, bounce, complaint and suppression changes',{parameters:[query('cursor','Increasing sequence; default 0'),query('limit','1 to 100; default 50')]}),
    },
    '/suppressions':{post:operation('contacts:write','Persist an idempotent email suppression',{requestBody:json({type:'object',additionalProperties:false,required:['email','reason','idempotencyKey'],properties:{email:{type:'string',format:'email'},reason:string,idempotencyKey:{type:'string',minLength:8,maxLength:200},occurredAt:date}})})},
    '/campaigns/{id}/send':{post:operation('campaigns:send','Queue a due, operator-approved exact segment revision',{parameters:[{name:'id',in:'path',required:true,schema:string}],requestBody:json({type:'object',additionalProperties:false,required:['revisionId','segmentId'],properties:{revisionId:string,segmentId:string}}),responses:{...responses,'202':{description:'Queued, not a provider delivery receipt.'}}})},
  },
};
