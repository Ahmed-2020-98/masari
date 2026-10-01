"use client";

import { Button, Dialog, DialogContent, DialogFooter } from "@masari/ui";

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = "تأكيد", tone = "danger", loading, onConfirm, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} size="sm">
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>تراجع</Button>
          <Button variant={tone === "danger" ? "danger" : "navy"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
