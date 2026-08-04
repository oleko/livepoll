/** A field label is resolved by the caller-supplied translator; this is just the lookup key. */
export type Translator = (key: string, values?: Record<string, string | number>) => string;

export type ConfigField =
  | { kind: "text"; name: string; labelKey: string; required?: boolean; maxLength?: number }
  | { kind: "textarea"; name: string; labelKey: string; required?: boolean; rows?: number; maxLength?: number }
  | { kind: "number"; name: string; labelKey: string; min?: number; max?: number }
  | { kind: "select"; name: string; labelKey: string; options: { value: string; labelKey: string }[]; numeric?: boolean }
  | { kind: "toggle"; name: string; labelKey: string }
  /** Newline-separated list, e.g. spin_wheel options. Stored as string[]. */
  | { kind: "list"; name: string; labelKey: string; itemMaxLength?: number; placeholderKey?: string; tooLongKey?: string };
