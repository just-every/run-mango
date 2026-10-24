# Getting started

Mango runs on your own computer first, which is the quickest way to look around and write drafts. Open a terminal (on a Mac, Terminal in Applications → Utilities; on Windows, your WSL2 distribution), copy this line into it and press Enter:

```bash
curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-mango
```

Git is required; rer brings Node and pnpm. Already have Node 22 or later? `npx -y @runeditrun/rer dev just-every/run-mango` does the same.

The line installs `rer`, the Run Edit Run command, clones Mango into a `run-mango` folder, installs everything, sets up a local owner and starts Mango. It prints `RER_READY` and a private `RER_OPEN` link: open that link on the same computer to enter as the owner, and keep it private. On first use, save your business details in **Set up your sender identity** to enter the app. This free copy runs only on your computer: it sends no email, and nobody else can open it.

If the installer prints a line that puts `rer` on your PATH, run that line too. To start Mango again later, run the same line from the same folder, or `cd run-mango && rer dev`. `rer dev --stop` stops it.

Next: [Install and deploy](./install.md) covers choosing the owner yourself and deploying Mango to your own Cloudflare account to send real mail.
