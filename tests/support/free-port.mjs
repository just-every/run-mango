import { createServer } from 'node:net';
/** Bind an ephemeral loopback socket; never assume a fixture port is available. */
export async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
export async function testPort(name) {
  if (!process.env[name]) process.env[name] = String(await freePort());
  const port = Number(process.env[name]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a valid TCP port.`);
  return port;
}
