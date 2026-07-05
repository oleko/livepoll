"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { type ComponentPropsWithoutRef } from "react";

type CheckboxProps = Omit<ComponentPropsWithoutRef<typeof RadixCheckbox.Root>, "className">;

export function Checkbox(props: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      {...props}
      className="h-4 w-4 shrink-0 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-white">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
