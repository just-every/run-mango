import seed from '../../../../seed.json' with {type:'json'};

export const capacityDefinitions={
  globalHour:{label:'Challenged signups per hour',floor:seed.limits.signupGlobalPerHour,seconds:3600},
  globalMinute:{label:'Challenged signups per minute',floor:seed.limits.signupGlobalPerMinute,seconds:60},
  unchallengedHour:{label:'Unchallenged signups per hour',floor:seed.limits.signupGlobalPerHour,seconds:3600},
  unchallengedMinute:{label:'Unchallenged signups per minute',floor:seed.limits.signupGlobalPerMinute,seconds:60},
  networkUnchallenged:{label:'Unchallenged signups per network per hour',floor:30,seconds:3600},
  networkChallenged:{label:'Challenged signups per network per hour',floor:120,seconds:3600},
  networkRefused:{label:'Refused attempts per network per hour',floor:60,seconds:3600},
  kioskNetwork:{label:'Kiosk signups per network per hour',floor:300,seconds:3600},
  kioskGlobal:{label:'Kiosk signups per hour',floor:300,seconds:3600},
} as const;
export type CapacityName=keyof typeof capacityDefinitions;
export type CapacityLevels=Record<CapacityName,number>;
export const databaseNow="CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER)";

export async function signupCapacity(db:D1Database) {
  const now=(await db.prepare(`SELECT ${databaseNow} AS now`).first<{now:number}>())!.now;
  const rows=(await db.prepare('SELECT name,effective_at,value FROM signup_allowance_levels ORDER BY effective_at').all<{name:CapacityName;effective_at:number;value:number}>()).results;
  const levels=Object.fromEntries(Object.entries(capacityDefinitions).map(([name,definition])=>[name,definition.floor])) as CapacityLevels;
  for(const row of rows)if(row.effective_at<=now)levels[row.name]=row.value;
  return {now,levels,allowances:Object.entries(capacityDefinitions).map(([name,definition])=>({name,...definition,
    ceiling:seed.limits.emailHandoffsPerMinute*definition.seconds/60,value:levels[name as CapacityName],
    scheduled:rows.filter(row=>row.name===name&&row.effective_at>now).at(-1)??null})),destinationPerDay:3};
}
