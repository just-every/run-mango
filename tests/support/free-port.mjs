import { createServer } from 'node:net';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Every listen(0) and connect() draws from the kernel's ephemeral range. A port
// probed there and released goes back into that pool: before a fixture's server
// binds it, any listener started meanwhile (wrangler, Miniflare, workerd) may draw
// the same number. Fixture ports therefore come from below the range.
let ephemeralFirst;
const ephemeralRangeStart = () => ephemeralFirst ??= process.platform === 'linux'
  ? Number(readFileSync('/proc/sys/net/ipv4/ip_local_port_range', 'utf8').trim().split(/\s+/)[0])
  : Math.min(...execFileSync('/usr/sbin/sysctl', ['-n', 'net.inet.ip.portrange.first', 'net.inet.ip.portrange.hifirst'], { encoding: 'utf8' }).trim().split(/\s+/).map(Number));
const issued = new Set();

/** Probe a loopback port no ephemeral listener can draw; never assume a fixture port is available. */
export async function freePort() {
  const low = 10000, high = ephemeralRangeStart() - 1;
  if (!Number.isInteger(high) || high <= low) throw new Error(`No fixture ports below the ephemeral range (${high + 1}).`);
  for (let attempt = 0; attempt < 100; attempt++) {
    const port = low + Math.floor(Math.random() * (high - low + 1));
    if (issued.has(port)) continue;
    const server = createServer();
    const listening = await new Promise((resolve, reject) => {
      server.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
      server.listen(port, '127.0.0.1', () => resolve(true));
    });
    if (!listening) continue;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    issued.add(port);
    return port;
  }
  throw new Error(`No free loopback port between ${low} and ${high}.`);
}
export async function testPort(name) {
  if (!process.env[name]) process.env[name] = String(await freePort());
  const port = Number(process.env[name]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a valid TCP port.`);
  return port;
}
