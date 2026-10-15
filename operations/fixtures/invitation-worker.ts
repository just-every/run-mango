// Test-only provider recorder and database barrier. Production Mango services,
// Base auth, transport serialization and D1 statements all execute unchanged.
import {queryMeter} from './query-meter.mjs';
import { createApp } from '../../src/core/app/app';
import { createProductionPlatform } from '../../src/core/platform/runtime';

function pausedDatabase(db, request) {
  const barrier = request.headers.get('X-Test-Barrier');
  const targetId = request.headers.get('X-Test-Target');
  const sqlPrefix=request.headers.get('X-Test-Sql-Prefix');
  if (!barrier || (!targetId&&!sqlPrefix)) return db;
  let held = false;
  const matching = new WeakSet();
  async function hold() {
    held = true;
    await db.prepare('INSERT INTO test_barriers(id,released) VALUES(?,0)').bind(barrier).run();
    const deadline = Date.now() + 60000;
    while (!(await db.prepare('SELECT released FROM test_barriers WHERE id=?').bind(barrier).first()).released) {
      if (Date.now() > deadline) throw new Error('Test barrier was not released');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  return new Proxy(db, { get(database, key) {
    if (key === 'batch' && request.headers.has('X-Test-Before-Batch')) return async statements => {
      if (!held && statements.some(statement => matching.has(statement))) await hold();
      return database.batch(statements);
    };
    if (key !== 'prepare') {
      const value = Reflect.get(database, key, database);
      return typeof value === 'function' ? value.bind(database) : value;
    }
    return (sql) => {
      const original = database.prepare(sql);
      if (!sql.trimStart().startsWith(sqlPrefix??'SELECT id, email, display_name AS displayName, role, status, version, created_at AS createdAt FROM oa_operators WHERE id=?')) return original;
      const wrap = (statement, args = []) => { const wrapped=new Proxy(statement, { get(prepared, field) {
        if (field === 'bind') return (...values) => wrap(prepared.bind(...values), values);
        if (field === 'first' || field === 'all' || field === 'raw') return async (...values) => {
          const result = await prepared[field](...values);
          if (!held && (!targetId||args[0] === targetId)) {
            await hold();
          }
          return result;
        };
        const value = Reflect.get(prepared, field, prepared);
        return typeof value === 'function' ? value.bind(prepared) : value;
      } }); matching.add(wrapped); return wrapped; };
      return wrap(original);
    };
  } });
}

export default {
  async fetch(envelope, env) {
    globalThis.fetch = async (url, options) => {
      if (url !== 'https://api.sendgrid.com/v3/mail/send') throw new Error('Unexpected test transport');
      await env.DB.prepare('INSERT INTO test_mail(body) VALUES(?)').bind(options.body).run();
      return new Response(null, { status: 202, headers: { 'x-message-id': 'test-provider-message' } });
    };
    const input = await envelope.json();
    const bodyBarrier=input.headers['X-Test-Body-Barrier'];
    const body=input.body&&bodyBarrier ? new ReadableStream({async pull(controller) {
      await env.DB.prepare('INSERT INTO test_barriers(id,released) VALUES(?,0)').bind(bodyBarrier).run();
      const deadline=Date.now()+60000;
      while(!(await env.DB.prepare('SELECT released FROM test_barriers WHERE id=?').bind(bodyBarrier).first()).released) {
        if(Date.now()>deadline)throw new Error('Test body barrier was not released');
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      controller.enqueue(new TextEncoder().encode(input.body));controller.close();
    }},{highWaterMark:0}) : input.body;
    const request = new Request(input.url, { method: input.method, headers: input.headers, ...(body ? { body } : {}) });
    const meter=queryMeter(pausedDatabase(env.DB,request));
    const bindings = { ...env, MANGO_JOBS:{async send(command){await env.DB.prepare('INSERT INTO test_queue(body) VALUES(?)').bind(JSON.stringify(command)).run();}}, DB: meter.db };
    const response=await createApp(bindings, createProductionPlatform(bindings)).fetch(request, bindings);
    response.headers.set('X-Test-D1-Queries',String(meter.count()));
    return response;
  },
};
