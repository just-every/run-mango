import seed from '../../../../seed.json' with {type:'json'};
import type { LifecycleRuntime } from './types';

export async function testSendAllowance(runtime: LifecycleRuntime, now = new Date()) {
  const day = now.toISOString().slice(0,10), limit = seed.limits.maxTestSendsPerDay;
  const row = await runtime.platform.database.$client.prepare('SELECT used FROM test_send_allowances WHERE day=?')
    .bind(day).first<{used:number}>();
  return {day, limit, remaining:Math.max(0,limit-(row?.used??0)), resetsAt:`${new Date(Date.parse(day)+86400000).toISOString()}`};
}

/** Reserve the whole request before its first hand-off; release only units never attempted. */
export async function reserveTestRequest(runtime: LifecycleRuntime, count: number, now: Date) {
  const db = runtime.platform.database.$client, limit = seed.limits.maxTestSendsPerDay;
  let day = now.toISOString().slice(0,10), reserved = count, attempted = 0;
  const reserve = async (date:string, units:number) => Boolean(await db.prepare(`INSERT INTO test_send_allowances(day,used)
    SELECT ?,? WHERE ?<=? ON CONFLICT(day) DO UPDATE SET used=used+excluded.used
    WHERE used+excluded.used<=? RETURNING used`).bind(date,units,units,limit,limit).first());
  const release = async () => {
    const unused = reserved-attempted;
    if (unused) await db.prepare('UPDATE test_send_allowances SET used=used-? WHERE day=?').bind(unused,day).run();
    reserved = attempted;
  };
  const refusal = async (time:Date) => {
    const allowance = await testSendAllowance(runtime,time);
    return `Daily test-send allowance: ${allowance.remaining} remaining. This test needs ${reserved-attempted} recipient hand-offs. Try again after ${allowance.resetsAt}.`;
  };
  if (count<1 || count>5) return {accepted:false as const,detail:'Enter between one and five test destinations.'};
  if (!await reserve(day,count)) return {accepted:false as const,detail:await refusal(now)};
  return {
    accepted:true as const,
    async attempt(time:Date) {
      const currentDay = time.toISOString().slice(0,10);
      if (currentDay!==day) {
        const remaining = reserved-attempted;
        await release();
        day=currentDay; reserved=0; attempted=0;
        if (!await reserve(day,remaining)) {reserved=remaining;const detail=await refusal(time);reserved=0;return detail;}
        reserved=remaining;
      }
      attempted++;
      return undefined;
    },
    deferred() {attempted--;},
    finish:release,
  };
}
export type TestSendReservation = Extract<Awaited<ReturnType<typeof reserveTestRequest>>, {accepted:true}>;
