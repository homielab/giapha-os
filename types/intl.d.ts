import vi from "../messages/vi.json";

type Messages = typeof vi;

declare global {
  // Enables TypeScript type checking for next-intl translation keys.
  // Any key not present in vi.json will cause a compile error.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
