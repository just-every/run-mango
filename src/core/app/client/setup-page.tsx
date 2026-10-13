import { productConfig } from '@/ext/config';
import { MangoMark } from '@/core/features/site/brand/MangoMark';
import { Art } from '@/core/features/site/drawings/Art';
import { Envelope } from '@/core/features/site/drawings/Envelope';
import { SettingsSenderForm } from '@/core/features/store/ui/settings-sender-form';
import type { SenderIdentity } from '@/core/features/settings/sender-validation';

/**
 * First-run setup in the landing's own manner: the lockup, a serif title and the sender form on the cream ground, beside
 * the letter that identity ends up on. The form is the Settings form; its saved callback opens the desk. Page styles:
 * styles/pages/setup.css. The owner's own address stands in for the sender and reply-to until they type another.
 */
export function SetupPage({ identity, ownerEmail }: { identity: SenderIdentity; ownerEmail: string }) {
  const start = { ...identity, fromEmail: identity.fromEmail || ownerEmail, replyToEmail: identity.replyToEmail || ownerEmail };
  return (
    <div className="mango-app app-standalone setup-page">
      <header className="simple-page__header">
        <a href="/" aria-label={`Back to ${productConfig.productName}`}>
          <span className="app-brand"><MangoMark className="app-brand__mark" /><span className="app-brand__name">{productConfig.productName}</span></span>
        </a>
      </header>
      <main className="setup-main">
        <section className="setup-copy" aria-labelledby="setup-title">
          <p className="eyebrow">Welcome to Mango</p>
          <h1 id="setup-title" className="standalone-title">Set up your sender identity</h1>
          <p className="setup-lede">Tell readers who you are. Save these details to open your newsletter desk; you can edit them later in Settings.</p>
          <SettingsSenderForm identity={start} saved={async () => {window.location.assign('/app');}} />
          <p className="standalone-note">Saving your identity sends no email. Provider configuration and sender authentication are checked separately before sending.</p>
        </section>
        <Art label="Two letters, stamped with the mango and postmarked approved" className="setup-art">
          <Envelope className="setup-envelope setup-envelope--sent" seed={61} postmark={{ rim: 'APPROVED' }} />
          <Envelope className="setup-envelope setup-envelope--next" seed={67} cancelled={false} />
        </Art>
      </main>
    </div>
  );
}
