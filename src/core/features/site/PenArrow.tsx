/** The hand-drawn arrow of the calls to action and the docs' previous and next cards. Decorative; turn it with CSS. */
export function PenArrow({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 26 16" aria-hidden="true" focusable="false">
      <path d="M1.5 8.2C8 7.8 15.6 8 24 8M17.6 1.8C19.8 4.4 21.8 6.4 24.2 8 21.8 9.6 19.6 11.6 17.4 14.2" />
    </svg>
  );
}
