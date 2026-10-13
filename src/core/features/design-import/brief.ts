/** Which design lines did not come from the operator's brief (DESIGN-004, decision D7a). A line counts as
 * from the brief only when the whole line appears in it as whole words, ignoring case, spacing and
 * typographic quotes: "Ripe" does not come from "Ripening". Image models invent copy, so every other line
 * is shown for review; Mango never verifies a claim. */
const normalise = (text: string) => text.normalize('NFKC').toLowerCase()
  .replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"')
  .replace(/\s+/g, ' ').trim();

export function linesNotInBrief(lines: string[], brief: string) {
  const source = normalise(brief);
  const wordCharacter = /[\p{L}\p{N}]/u;
  const inBrief = (line: string) => {
    const wanted = normalise(line);
    if (!wanted) return true;
    for (let at = source.indexOf(wanted); at >= 0; at = source.indexOf(wanted, at + 1)) {
      const before = source[at - 1] ?? ' ', after = source[at + wanted.length] ?? ' ';
      if (!(wordCharacter.test(wanted[0]) && wordCharacter.test(before)) && !(wordCharacter.test(wanted.at(-1)!) && wordCharacter.test(after))) return true;
    }
    return false;
  };
  return [...new Set(lines)].filter(line => !inBrief(line));
}

/** The brief Mango offers before an import: the draft's own name, subject, preheader and sender. */
export function draftBrief(draft: { name?: string; emailSubject?: string; preheader?: string | null; senderName?: string }) {
  return [draft.name, draft.emailSubject, draft.preheader, draft.senderName].map(value => (value ?? '').trim()).filter(Boolean).join('\n');
}
