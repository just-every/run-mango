// The inline stylesheet of the server-rendered message pages (message-page.ts): the standalone frame of sign-in and
// subscribe drawn without the app's stylesheet. The Hono routes that serve these pages also run under Node in the test
// harness, so they cannot import the site's CSS through Vite; the colours are palette.css's values and the drawing rules
// follow site/styles/paper.css and mail.css; the frame, title, text and button sizes are pages/public.css's standalone
// ones. Keep them in step. The faces are the site's own, linked from the head (public/fonts/fonts.css).

const palette = ':root{--ground:#fbf7ee;--paper:#fffdf8;--ink:#1d1b17;--ink-soft:#37332d;--muted:#5c574f;--pencil:#a59c8a;--sun:#ffcf47;--sun-hover:#ffc21f;--mango:#f6b828;--amber:#8c5b0c;'
  + "--serif:Newsreader,'Newsreader Fallback','Newsreader Fallback Times',Georgia,serif;--sans:Outfit,'Outfit Fallback','Avenir Next','Segoe UI',sans-serif;color-scheme:light;"
  // The docs' sunny pencil stroke under a title (DocsTitleStroke), as a mask painted in the sun colour.
  + `--stroke:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 18' fill='none' stroke='%23000' stroke-linecap='round'%3E%3Cpath stroke-width='4.8' d='M3.5 11.2C40 7.4 92 5.2 142 6.1 176 6.7 206 8.4 236 11'/%3E%3Cpath stroke-width='1.8' opacity='.5' d='M14 14.2C58 11.2 112 10.2 160 11.2 182 11.7 202 12.8 222 14.4'/%3E%3C/svg%3E")}`;

const frame = '*,::before,::after{box-sizing:border-box}'
  + 'html,body{margin:0;background:var(--ground);color:var(--ink)}'
  + 'body{display:flex;flex-direction:column;min-height:100vh;min-height:100dvh;font:400 17px/1.55 var(--sans);-webkit-font-smoothing:antialiased}'
  + '.head{display:flex;align-items:center;height:96px;padding:0 clamp(16px,5.6vw,88px)}'
  + '.brand{display:inline-flex;align-items:center;gap:12px;font:400 32px/1 var(--serif);letter-spacing:-.025em}'
  + '.brand svg{width:36px;height:auto}'
  + 'main{display:grid;flex:1;align-content:start;justify-items:center;padding:24px clamp(16px,5.6vw,88px) 72px}'
  + '@media(min-height:860px){main{align-content:center;padding-bottom:120px}}';

const paper = '.paper{position:relative;isolation:isolate;width:min(100%,30rem)}'
  + '.paper::before{position:absolute;z-index:-1;inset:12px -8px -9px 10px;border-radius:6px;background:repeating-linear-gradient(-58deg,rgb(112 98 72/.2) 0 1px,transparent 1px 3.6px);content:"";filter:blur(.35px)}'
  + '.paper-face{position:relative;padding:44px 44px 40px;border-radius:6px;background:linear-gradient(168deg,var(--paper) 0%,#fffaf0 62%,#fbf3e2 100%);box-shadow:0 12px 20px -16px rgb(84 64 28/.38),0 1px 3px rgb(84 64 28/.06);overflow-wrap:anywhere}'
  + '.paper-pencil{position:absolute;inset:0;width:100%;height:100%;overflow:visible;fill:none;stroke:var(--pencil);stroke-width:1.2px;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}'
  + '.paper-pencil path{vector-effect:non-scaling-stroke}.paper-pencil-ghost{opacity:.45;stroke-width:.9px}';

const stamp = '.stamp{position:absolute;top:-16px;right:28px;width:56px;container-type:inline-size;aspect-ratio:.88;rotate:6deg;filter:drop-shadow(0 1px 1.5px rgb(84 64 28/.28))}'
  + '.stamp-sheet{--t:9.5cqw;position:absolute;inset:0;padding:calc(var(--t)*.46);background:#fffaf0;'
  + '-webkit-mask:linear-gradient(#000 0 0) content-box,radial-gradient(circle closest-side,transparent 66%,#000 72%) calc(var(--t)/-2) calc(var(--t)/-2)/var(--t) var(--t) round;'
  + 'mask:linear-gradient(#000 0 0) content-box,radial-gradient(circle closest-side,transparent 66%,#000 72%) calc(var(--t)/-2) calc(var(--t)/-2)/var(--t) var(--t) round}'
  + '.stamp-print{display:grid;place-items:center;width:100%;height:100%;border:2.4cqw solid #f0b42a;background:radial-gradient(circle at 40% 45%,#fff3c9 0%,#ffe492 70%,#fbd56a 100%)}'
  + '.stamp-fruit{width:80%;height:auto}';

// The postmark struck across the stamp once the reader has said yes: the ring with YES round its rim and a tick.
const postmark = '.postmark{position:absolute;top:22px;right:52px;width:104px;container-type:inline-size;aspect-ratio:1.9;rotate:-8deg}'
  + '.postmark-ring{position:absolute;top:0;left:0;width:53%;height:auto;overflow:visible;fill:none;stroke:#625c53;stroke-width:1.4}'
  + '.postmark-ring circle{vector-effect:non-scaling-stroke}.postmark-inner{stroke-dasharray:3 1.4;opacity:.7}'
  + '.postmark-rim text{fill:#4f4a43;stroke:none;font:600 10.2px var(--sans)}'
  + '.postmark-tick{stroke:#4f4a43;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}.postmark-dot{fill:#625c53;stroke:none}'
  + '.waves{position:absolute;top:26%;left:49%;width:51%;height:48%;overflow:visible;fill:none;stroke:#6c665d;stroke-width:1.15;stroke-linecap:round;opacity:.8}'
  + '.waves path{vector-effect:non-scaling-stroke}';

const content = 'h1{margin:0;font:400 clamp(36px,4vw,48px)/1.04 var(--serif);letter-spacing:-.035em;text-wrap:balance}.stamp~h1{padding-right:56px}'
  + 'h1::after{display:block;width:min(196px,58%);height:15px;margin-top:12px;background:var(--sun);content:"";-webkit-mask:var(--stroke) left/100% 100% no-repeat;mask:var(--stroke) left/100% 100% no-repeat}'
  + 'p{max-width:34em;margin:16px 0 0;color:var(--ink-soft);text-wrap:pretty}'
  + '.links{display:grid;justify-items:start;gap:8px}'
  + 'a{color:var(--ink);font-weight:500;text-decoration:underline 2px var(--mango);text-underline-offset:4px;transition:text-decoration-color .18s}'
  + 'a:hover{text-decoration-color:var(--ink)}a:is(:focus,:focus-visible){outline:3px solid var(--ink);outline-offset:3px}'
  + 'form{margin:32px 0 0}'
  + 'button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border:1.5px solid var(--sun);border-radius:4px;background:var(--sun);color:var(--ink);font:500 17px/1.1 var(--sans);cursor:pointer;transition:background-color .18s,border-color .18s}'
  + 'button:hover{border-color:var(--sun-hover);background:var(--sun-hover)}'
  + 'button:is(:focus,:focus-visible){outline:3px solid var(--ink);outline-offset:3px}'
  + '@media(max-width:680px){.head{height:72px}.brand{font-size:26px}.brand svg{width:28px}main{padding-top:12px;padding-bottom:56px}'
  + '.paper-face{padding:36px 24px 28px}form{margin-top:24px}.stamp{right:18px;width:48px}.postmark{right:36px;width:92px}.stamp~h1{padding-right:44px}}'
  + '@media(max-width:480px){button{width:100%}}'
  + '@media(prefers-reduced-motion:reduce){button,a{transition:none}}';

const preferenceFields='.message-fields{display:grid;gap:18px;margin-bottom:24px}.message-fields label{display:grid;gap:6px;font-size:17px}.message-fields input,.message-fields select{width:100%;min-width:0;min-height:44px;padding:8px;border:1px solid var(--pencil);border-radius:4px;background:var(--paper);color:var(--ink);font:inherit}.message-fields :is(input,select):focus-visible{outline:3px solid var(--ink);outline-offset:2px}.message-secondary{margin-top:16px;background:transparent;border-color:var(--ink)}';
export const messageStyles = palette + frame + paper + stamp + postmark + content + preferenceFields;
