"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { type ReactNode } from "react";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] p-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
      {children}
    </div>
  );
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <RadixDialog.Title className="text-sm font-semibold text-slate-900 dark:text-white">
      {children}
    </RadixDialog.Title>
  );
}

export function DialogRawContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 outline-none ${className}`}
        style={{ background: "transparent" }}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
