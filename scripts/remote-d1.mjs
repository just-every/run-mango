/** Cloudflare's authenticated D1 query API; errors never include credentials or SQL. */
export function remoteD1({ accountId, token, databaseId, fetch: request = globalThis.fetch }) {
  async function execute(statements) {
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({batch:statements}),signal:AbortSignal.timeout(30_000) });
    const data=await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.result) || data.result.length !== statements.length || data.result.some(row => row.success !== true || !Array.isArray(row.results))) throw new Error(`Remote D1 query failed (HTTP ${response.status}).`);
    return data.result;
  }
  const prepare=(sql,params=[])=>({sql,params,bind(...values){return prepare(sql,values)},
    async all(){return (await execute([{sql,params}]))[0]},async run(){return this.all()},
    async first(column){const row=(await this.all()).results[0]??null;return column&&row?row[column]:row} });
  return {prepare,batch:statements=>execute(statements.map(({sql,params})=>({sql,params}))) };
}
