"use client";

import { Toaster as Sonner, toast } from "sonner";

export { toast };

export function Toaster() {
  return (
    <Sonner
      dir="rtl"
      position="top-center"
      richColors
      closeButton
      toastOptions={{ style: { fontFamily: "var(--font-sans)", borderRadius: 12 } }}
    />
  );
}
