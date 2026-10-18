import { allowedEmailAttribute, escapeHtml, inspectEmailHtml, safeEmailUrl } from '../campaigns/email-html-policy';
import { parseEmailHtml } from '../campaigns/email-html-parse';
import { assertEmailSize, EmailTooLargeError } from '../campaigns/email-size';
import { normalizeAuthoredContent } from '../campaigns/authoring-content';
import { DesignImportError } from './layerdoc';
import { columnGap, columnWidth, emailWidth, gutter, type DesignPlan, type ImageBlock, type Row, type TextBlock } from './plan';

/** A hosted copy of one image the plan asked for: its URL on Mango's own origin. */
export type HostedImage = { url: string };

const buttonPadding = 32;
const row = (inner: string, padding = `0 ${gutter}px 28px`) => `<tr><td style="padding:${padding}">${inner}</td></tr>`;
const lines = (text: string) => text.split('\n').map(part => escapeHtml(part.trim())).filter(Boolean).join('<br>');

function textBlock(block: TextBlock) {
  const weight = block.tag === 'p' && !block.bold ? '' : `;font-weight:${block.bold ? 'bold' : 'normal'}`;
  const spacing = block.spacing ? `;letter-spacing:${block.spacing}px` : '';
  return `<${block.tag} style="margin:${block.margin};font-family:${block.font};font-size:${block.size}px;line-height:${block.lineHeight}${weight}${spacing};color:${block.colour};text-align:${block.align}">${lines(block.text)}</${block.tag}>`;
}

function imageTag(block: ImageBlock, hosted: ReadonlyMap<string, HostedImage>, mediaOrigin?: string) {
  const image = hosted.get(block.id);
  if (!image || !allowedEmailAttribute('img', 'src', image.url, mediaOrigin)) throw new DesignImportError('invalid_layout', `The image "${block.alt}" has no address on this deployment that email can use.`);
  const radius = block.radius ? `;border-radius:${block.radius}px` : '';
  // No display (MSG-012): an image keeps its inline box. One on a line of its own aligns to the line's bottom, so the
  // line is exactly as tall as the image, as a block image is; an emblem keeps its baseline like the text beside it.
  const align = block.inline ? '' : ';vertical-align:bottom';
  return `<img src="${escapeHtml(image.url)}" width="${block.width}" height="${block.height}" alt="${escapeHtml(block.alt)}" border="0" style="width:100%;max-width:${block.width}px;height:auto;border:0${radius}${align}">`;
}

function rowHtml(item: Row, hosted: ReadonlyMap<string, HostedImage>, href: string | undefined, mediaOrigin?: string) {
  if (item.kind === 'stack') {
    const header = item.items.every(part => 'tag' in part ? part.align === 'center' : part.inline);
    return row(item.items.map(part => 'tag' in part ? textBlock(part) : part.inline ? `<div style="text-align:center">${imageTag(part, hosted, mediaOrigin)}</div>` : `<div style="padding:0 0 20px">${imageTag(part, hosted, mediaOrigin)}</div>`).join(''), header ? `24px ${gutter}px 24px` : undefined);
  }
  if (item.kind === 'columns') {
    // Two cells of one row, each vertically centred on the other, as the design draws them. Only table cells hold a
    // layout without display (MSG-012), so the columns stay side by side on phones too, narrowing with the email.
    const cell = (inner: string) => `<td width="${columnWidth}" valign="middle">${inner}</td>`;
    const photo = cell(imageTag(item.photo, hosted, mediaOrigin)), copy = cell(`<div style="padding:16px 0 0">${item.words.map(textBlock).join('')}</div>`);
    return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${item.side === 'left' ? photo : copy}<td width="${columnGap}"></td>${item.side === 'left' ? copy : photo}</tr></table>`);
  }
  if (item.kind === 'button') {
    if (!href) throw new DesignImportError('invalid_layout', 'The design has a button, so it needs an HTTPS destination.');
    // The fill is the cell's (only cells paint, MSG-012) and the cell's padding sets the button's size. A painted cell
    // rounds its corners by at most its side padding; at the button's height any radius above 24px draws the same pill.
    // The link's own vertical padding takes no room in its line and makes the whole height of the button clickable.
    const text = `font-family:${item.font};font-size:17px;line-height:1.2`;
    const button = `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${item.fill}" style="background-color:${item.fill};border-radius:${Math.min(item.radius, buttonPadding)}px;padding:14px ${buttonPadding}px;${text}"><a href="${escapeHtml(href)}" style="padding:14px 0;${text};color:${item.ink};text-decoration:none">${escapeHtml(item.label)}</a></td></tr></table>`;
    return row(item.words.map(textBlock).join('') + button, `4px ${gutter}px 32px`);
  }
  if (item.kind === 'rule') return `<tr><td style="padding:0 ${gutter}px"><div style="border-top:1px solid ${item.colour};padding-top:1px"></div></td></tr>`;
  const small = (inner: string, colour: string) => `<p style="margin:0 0 8px;font-family:${item.font};font-size:12px;line-height:1.5;color:${colour};text-align:center">${inner}</p>`;
  return row([
    ...item.notes.map(textBlock),
    small(`<a href="{{unsubscribe_url}}" style="color:${item.linkColour};text-decoration:underline">Unsubscribe</a>`, item.linkColour),
    small('{{physical_address}}', item.muted),
  ].join(''), `24px ${gutter}px 32px`);
}

/** Writes the 600px table email for a plan whose images are hosted. The output is checked with the same
 * checker approval uses before it is offered, so nothing outside the grammar ever reaches the editor.
 * `mediaOrigin` is the deployment's own origin: on a copy running on a computer its images are http,
 * which a draft may hold and approval refuses (CAMP-012). */
export function compileDesignEmail(plan: DesignPlan, hosted: ReadonlyMap<string, HostedImage>, buttonHref?: string, mediaOrigin?: string) {
  if (plan.buttonLabel && (!buttonHref || !safeEmailUrl(buttonHref))) throw new DesignImportError('invalid_layout', 'The button destination must be an HTTPS address.');
  // The outer wrapper is the one cell of a full-width table: it carries the design's page colour (only cells paint,
  // MSG-012), and every other cell is transparent over it. A word too long for its column wraps inside it.
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${plan.background}" style="background-color:${plan.background};padding:16px 0;overflow-wrap:anywhere">`
    + `<table role="presentation" width="${emailWidth}" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${emailWidth}px">`
    + plan.rows.map(item => rowHtml(item, hosted, buttonHref, mediaOrigin)).join('') + '</table></td></tr></table>';
  // The editor receives the form saving stores (CAMP-003), so saving the import changes nothing in it.
  const {canonical} = parseEmailHtml(html);
  const issues = inspectEmailHtml(canonical, mediaOrigin).issues;
  if (issues.length) throw new DesignImportError('invalid_layout', `The compiled email would not pass approval: ${issues.join(' ')}`);
  const saved=normalizeAuthoredContent({emailBody:canonical});
  try {assertEmailSize({emailSubject:'',emailBody:saved.emailBody!,emailText:saved.emailText!,preheader:'',physicalAddress:'',smsBody:''},{publicBaseUrl:mediaOrigin});}
  catch(error) {if(error instanceof EmailTooLargeError)throw new DesignImportError('unsupported_design',error.message);throw error;}
  return canonical;
}
