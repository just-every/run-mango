import { ErrorCodes, Parser, defaultTreeAdapter, html, serialize, type DefaultTreeAdapterMap, type DefaultTreeAdapterTypes, type ParserError, type Token } from 'parse5';
import { protectAuthoringTokens } from './authoring-tokens';

/** The one reading of email HTML that saving, approval, test send, delivery, the preview and the plain-text
 * part share (MSG-009, MSG-012). parse5 implements the WHATWG HTML parser, so the tree here is the tree a
 * recipient's mail client builds: the body is parsed as the content of `<body>` with scripting off, as mail
 * clients read it. Personalisation tokens are kept whole, as written, wherever they stand. Nothing here judges
 * the grammar; email-html-policy.ts does, on this tree and on the facts about how the body was written. */

export type EmailText = { kind: 'text'; text: string };
export type EmailComment = { kind: 'comment' };
export type EmailElement = {
  kind: 'element'; tag: string;
  /** False for SVG and MathML elements. */
  html: boolean;
  /** Decoded values, as mail clients read them. */
  attributes: ReadonlyMap<string, string>;
  /** Each value exactly as the body writes it, character references undecoded; empty for elements parsers add. */
  written: ReadonlyMap<string, string>;
  /** Closed by its own end tag; void elements are always closed. */
  closed: boolean;
  children: EmailNode[];
};
export type EmailNode = EmailText | EmailComment | EmailElement;
export type ParsedEmailHtml = {
  nodes: EmailNode[];
  /** Every tag name the body writes, including tags parsers ignore or rename. */
  tags: ReadonlySet<string>;
  /** Syntax parsers read differently from how it looks: malformed tags and comments, unquoted attributes. */
  malformed: string[];
  /** Attributes the body writes that parsers drop: a repeated attribute, attributes on an end tag or on a tag parsers ignore. */
  lost: string[];
  /** The first place parsers build different markup from the markup as written (an implicit close, content moved
   * out of a table, an ignored or renamed tag). A tbody that parsers add around table rows does not count. */
  rewritten?: { written: string; parsed: string };
  /** The tree serialised by the HTML fragment serialisation algorithm: the form every saved body is stored in. */
  canonical: string;
};

const voidTags = new Set(['area', 'base', 'basefont', 'bgsound', 'br', 'col', 'embed', 'frame', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const rawTextTags = new Set(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'plaintext']);
// Parse errors about single characters and references, and tree-construction errors, whose result the tree shows
// and the well-formedness rule for styled markup judges. A `<` that starts no tag (`< p>`, `< /span>`) is text to every
// parser, so the tree shows it as written; after `</` it starts a comment, which the grammar refuses. Every other
// parse error is malformed syntax.
const readable = new Set<string>([ErrorCodes.invalidFirstCharacterOfTagName,
  ErrorCodes.controlCharacterInInputStream, ErrorCodes.noncharacterInInputStream, ErrorCodes.surrogateInInputStream,
  ErrorCodes.unexpectedNullCharacter, ErrorCodes.unknownNamedCharacterReference, ErrorCodes.missingSemicolonAfterCharacterReference,
  ErrorCodes.absenceOfDigitsInNumericCharacterReference, ErrorCodes.nullCharacterReference, ErrorCodes.surrogateCharacterReference,
  ErrorCodes.characterReferenceOutsideUnicodeRange, ErrorCodes.controlCharacterReference, ErrorCodes.noncharacterCharacterReference,
  ErrorCodes.endTagWithoutMatchingOpenElement, ErrorCodes.closingOfElementWithOpenChildElements, ErrorCodes.openElementsLeftAfterEof,
  ErrorCodes.eofInElementThatCanContainOnlyText, ErrorCodes.abandonedHeadElementChild, ErrorCodes.misplacedStartTagForHeadElement,
  ErrorCodes.nestedNoscriptInHead, ErrorCodes.disallowedContentInNoscriptInHead, ErrorCodes.missingDoctype, ErrorCodes.nonConformingDoctype,
]);
const lossy = new Set<string>([ErrorCodes.duplicateAttribute, ErrorCodes.endTagWithAttributes]);

const escapeText = (value: string) => value.replace(/[&<> ]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', ' ': '&nbsp;' })[character]!);
const escapeAttribute = (value: string) => value.replace(/["& ]/g, character => ({ '"': '&quot;', '&': '&amp;', ' ': '&nbsp;' })[character]!);
type TagRecord = { name: string; end: boolean; attrs: Token.Attribute[]; location: Token.LocationWithAttributes | null };

/** The parser itself, also writing down each token as it arrives: the markup as written, serialised the way
 * the serialiser writes a tree, and every tag with its attributes before tree construction drops or renames it. */
class WrittenTokens extends Parser<DefaultTreeAdapterMap> {
  written = '';
  tags: TagRecord[] = [];
  private rawText?: string;
  private record(tag: TagRecord) {
    this.tags.push(tag);
    if (tag.end) { if (tag.name === this.rawText) this.rawText = undefined; this.written += `</${tag.name}>`; return; }
    this.written += `<${tag.name}${tag.attrs.map(attribute => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join('')}>`;
    if (rawTextTags.has(tag.name)) this.rawText = tag.name;
  }
  override onStartTag(token: Token.TagToken) {
    this.record({ name: token.tagName, end: false, attrs: token.attrs.map(attribute => ({ ...attribute })), location: token.location });
    super.onStartTag(token);
  }
  override onEndTag(token: Token.TagToken) {
    this.record({ name: token.tagName, end: true, attrs: token.attrs.map(attribute => ({ ...attribute })), location: token.location });
    super.onEndTag(token);
  }
  override onCharacter(token: Token.CharacterToken) { this.characters(token.chars); super.onCharacter(token); }
  override onWhitespaceCharacter(token: Token.CharacterToken) { this.characters(token.chars); super.onWhitespaceCharacter(token); }
  override onNullCharacter(token: Token.CharacterToken) { this.characters(token.chars); super.onNullCharacter(token); }
  override onComment(token: Token.CommentToken) { this.written += `<!--${token.data}-->`; super.onComment(token); }
  override onDoctype(token: Token.DoctypeToken) { this.written += `<!DOCTYPE ${token.name ?? ''}>`; super.onDoctype(token); }
  private characters(chars: string) { this.written += this.rawText ? chars : escapeText(chars); }
}

/** An element's children, or an HTML template's content; an SVG or MathML element named template has plain children. */
const contentOf = (node: DefaultTreeAdapterTypes.Element): DefaultTreeAdapterTypes.ParentNode =>
  node.tagName === 'template' && node.namespaceURI === html.NS.HTML ? defaultTreeAdapter.getTemplateContent(node as DefaultTreeAdapterTypes.Template) : node;
/** The HTML fragment serialisation of a parsed body, written so that parsing it again builds the same tree: an HTML
 * pre, textarea or listing whose text starts with a line break gets the extra one parsers drop, and everything after
 * an HTML plaintext element's text is left out (its own end tag and its ancestors'), since parsers never close one
 * and would read them as its text: the end of that text is marked with characters the tree does not contain. */
function canonicalSerialization(fragment: DefaultTreeAdapterTypes.DocumentFragment) {
  let plaintext: DefaultTreeAdapterTypes.Element | undefined;
  const visit = (node: DefaultTreeAdapterTypes.ParentNode) => {
    for (const child of node.childNodes) {
      if (!defaultTreeAdapter.isElementNode(child)) continue;
      const first = child.childNodes[0], htmlElement = child.namespaceURI === html.NS.HTML;
      if (htmlElement && ['pre', 'textarea', 'listing'].includes(child.tagName) && first && defaultTreeAdapter.isTextNode(first) && first.value.startsWith('\n')) first.value = `\n${first.value}`;
      if (htmlElement && child.tagName === 'plaintext') plaintext = child;
      visit(contentOf(child));
    }
  };
  visit(fragment);
  const whole = serialize(fragment, { scriptingEnabled: false });
  if (!plaintext) return whole;
  let end = '\uE002end';
  while (whole.includes(end)) end += 'x';
  defaultTreeAdapter.insertText(plaintext, end);
  const serialized = serialize(fragment, { scriptingEnabled: false });
  return serialized.slice(0, serialized.indexOf(end));
}
const withoutTbody = (markup: string) => markup.replaceAll('<tbody>', '').replaceAll('</tbody>', '');
const quoted = (written: string) => written.includes('=') && /["']$/.test(written);
const attributeValue = (written: string) => written.includes('=') ? written.slice(written.indexOf('=') + 1).trim().replace(/^(["'])([\s\S]*)\1$/, '$2') : '';

export function parseEmailHtml(source: string): ParsedEmailHtml {
  const tokens = protectAuthoringTokens(source);
  const markup = tokens.html, restore = (value: string) => tokens.restore(value);
  const errors: ParserError[] = [];
  const context = defaultTreeAdapter.createElement('body', html.NS.HTML, []);
  const parser = WrittenTokens.getFragmentParser(context, { sourceCodeLocationInfo: true, scriptingEnabled: false, onParseError: error => errors.push(error) }) as WrittenTokens;
  parser.tokenizer.write(markup, true);
  const fragment = parser.getFragment();
  const near = (start: number, end = start) => `“${restore(markup.slice(Math.max(0, start - 24), end + 24)).replace(/\s+/g, ' ').trim()}”`;

  const started = new Set<number>();
  const convert = (node: DefaultTreeAdapterTypes.ChildNode): EmailNode => {
    if (defaultTreeAdapter.isTextNode(node)) return { kind: 'text', text: restore(node.value) };
    if (!defaultTreeAdapter.isElementNode(node)) return { kind: 'comment' };
    const location = node.sourceCodeLocation;
    if (location?.startTag) started.add(location.startTag.startOffset);
    const children = contentOf(node).childNodes;
    return {
      kind: 'element', tag: restore(node.tagName), html: node.namespaceURI === html.NS.HTML,
      attributes: new Map(node.attrs.map(attribute => [restore(attribute.name), restore(attribute.value)])),
      written: new Map(Object.entries(location?.attrs ?? {}).map(([name, at]) => [restore(name), restore(attributeValue(markup.slice(at.startOffset, at.endOffset)))])),
      closed: voidTags.has(node.tagName) || Boolean(location?.endTag),
      children: children.map(convert),
    };
  };
  const nodes = fragment.childNodes.map(convert);

  const malformed: string[] = [], lost: string[] = [];
  for (const error of errors) {
    if (lossy.has(error.code)) lost.push(`Mail clients drop ${error.code === ErrorCodes.duplicateAttribute ? 'an attribute written twice on one tag' : 'attributes written on a closing tag'} near ${near(error.startOffset, error.endOffset)}. Write each attribute once, on its opening tag.`);
    else if (!readable.has(error.code)) malformed.push(`Malformed HTML near ${near(error.startOffset, error.endOffset)} (${error.code.replaceAll('-', ' ')}): mail clients read it differently from how it looks.`);
  }
  for (const tag of parser.tags) {
    const location = tag.location;
    if (tag.end || !location) continue;
    if (tag.attrs.length && !started.has(location.startOffset)) lost.push(`Mail clients ignore ${near(location.startOffset, location.endOffset)} here, with its attributes: <${restore(tag.name)}> cannot sit at this place in the body.`);
    for (const at of Object.values(location.attrs ?? {})) {
      const written = markup.slice(at.startOffset, at.endOffset);
      if (!quoted(written)) malformed.push(`Attribute values must be quoted: ${near(at.startOffset, at.endOffset)}.`);
    }
  }

  const serialized = canonicalSerialization(fragment);
  const written = withoutTbody(restore(parser.written)), parsed = withoutTbody(restore(serialized));
  let rewritten: ParsedEmailHtml['rewritten'];
  if (written !== parsed) {
    let at = 0;
    while (written[at] === parsed[at]) at++;
    const excerpt = (value: string) => `${at > 30 ? '…' : ''}${value.slice(Math.max(0, at - 30), at + 30)}${value.length > at + 30 ? '…' : ''}`;
    rewritten = { written: excerpt(written), parsed: excerpt(parsed) };
  }
  return {
    nodes, tags: new Set(parser.tags.map(tag => restore(tag.name))), malformed: [...new Set(malformed)], lost: [...new Set(lost)],
    rewritten, canonical: restore(serialized),
  };
}
