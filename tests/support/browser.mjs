export const launchOptions = {
  ...(process.env.MANGO_CHROMIUM_EXECUTABLE ? {executablePath:process.env.MANGO_CHROMIUM_EXECUTABLE} : {}),
  args:['--use-mock-keychain','--password-store=basic','--no-sandbox'],
};
