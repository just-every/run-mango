const defaultPort = 15660;

export function localPort(value = process.env.MANGO_PORT ?? String(defaultPort)) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`MANGO_PORT must be a valid TCP port; received ${JSON.stringify(value)}.`);
  }
  return port;
}
