/** Longest email body and plain text a draft save accepts (CAMP-002), shared by the save schema and design import.
 * It stays below seed.json maxEmailHtmlBytes (102,400, where Gmail clips a message) on purpose: 20,000
 * characters are at most 80,000 UTF-8 bytes, which leaves room for the renderer's wrapper, the managed
 * footer and rewritten link addresses. A designed email compiles to about 5,500 characters. */
export const maxEmailBodyCharacters = 20_000;
/** The width of the email column Mango's design compiler lays a design out in, and the widest image Insert image writes. */
export const emailColumnPixels = 600;
