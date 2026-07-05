"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { type ComponentPropsWithoutRef } from "react";

type SwitchProps = Omit<ComponentPropsWithoutRef<typeof RadixSwitch.Root>, "className">;

export function Switch(props: SwitchProps) {
  return (
    <RadixSwitch.Root
      {...props}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-200 dark:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 data-[state=checked]:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RadixSwitch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </RadixSwitch.Root>
  );
}
