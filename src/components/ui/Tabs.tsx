"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { type ReactNode } from "react";

export const Tabs = RadixTabs.Root;

export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List className={`flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 ${className}`}>
      {children}
    </RadixTabs.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className="flex-1 text-sm font-medium py-2.5 rounded-md transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
    >
      {children}
    </RadixTabs.Trigger>
  );
}

export function TabsContent({ value, children, className = "" }: { value: string; children: ReactNode; className?: string }) {
  return (
    <RadixTabs.Content value={value} className={className}>
      {children}
    </RadixTabs.Content>
  );
}
