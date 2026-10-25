/** Only map incumbent fields with an existing Mango rendering contract. Unknown
 * fields remain visible, so the ordinary personalization check still blocks. */
export function convertTemplateTokens(source: string) {
  const mapped: string[] = [], unmapped: string[] = [];
  const targets: Record<string, string> = {
    '*|FNAME|*': '{{displayName | fallback: "there"}}',
    '*|UNSUB|*': '{{unsubscribe_url}}',
    '*|LIST:ADDRESS|*': '{{physical_address}}',
    '*|LIST:ADDRESSLINE|*': '{{physical_address}}',
    '{{ first_name }}': '{{displayName | fallback: "there"}}',
  };
  const html = source.replace(/\*\|[^|*\s][^|]{0,80}?\|\*|\{\{\s*first_name\s*\}\}/g, (tag, offset: number) => {
    const key = /^\{\{/.test(tag) ? '{{ first_name }}' : tag;
    const target = targets[key];
    if (target) mapped.push(`Mapped ${tag} to ${target} at source character ${offset + 1}`);
    else unmapped.push(`Unmapped ${tag} at source character ${offset + 1}`);
    return target ?? tag;
  });
  return { html, mapped, unmapped };
}
