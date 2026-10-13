// The site's shared styles, which the app draws from: the skip link, the drawn materials (Paper, Stamp, Envelope,
// Postmark) and the reduced-motion rule, all scoped :is(.mango-site, .mango-app); the rest stays .mango-site only.
// The whole site index is imported (not single files) so the build keeps it as one chunk in its own order, and the
// landing and docs cascade exactly as before. Every .mango-app root imports this module.
import '@/core/features/site/styles';
