import { Ban, CheckCircle2, Pencil, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

export function HomeEditorShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="border-b border-[var(--admin-border)] pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--admin-accent)]">
          Home · CMS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--admin-navy)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--admin-muted)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function EditorPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md shadow-[#0a2540]/[0.06] ${className}`}
    >
      {title ? (
        <h2 className="mb-5 border-b border-slate-100 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export const fieldLabel =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";
export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";
export const textareaClass = `${inputClass} min-h-[88px] resize-y font-sans`;
export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[var(--admin-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:opacity-45";
export const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-45";
export const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100";

const iconBtnBase =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/25";

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="admin-confirm-title" className="text-lg font-bold text-[var(--admin-navy)]">
          {title}
        </h2>
        <div className="mt-2 text-sm text-slate-600">{message}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={btnSecondary}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
                : btnPrimary
            }
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminIconActions({
  onEdit,
  onDelete,
  onToggleActive,
  isActive = true,
  editLabel = "Edit",
  deleteLabel = "Delete",
  hideDelete = false,
}: {
  onEdit: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
  isActive?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  hideDelete?: boolean;
}) {
  const toggleLabel = isActive ? "Disable (hide from site)" : "Enable (show on site)";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        title={editLabel}
        aria-label={editLabel}
        className={`${iconBtnBase} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      {onToggleActive ? (
        <button
          type="button"
          onClick={onToggleActive}
          title={toggleLabel}
          aria-label={toggleLabel}
          className={`${iconBtnBase} ${
            isActive
              ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </button>
      ) : null}
      {!hideDelete ? (
        <button
          type="button"
          onClick={onDelete}
          title={deleteLabel}
          aria-label={deleteLabel}
          className={`${iconBtnBase} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "default",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "large" | "xlarge";
}) {
  if (!open) return null;

  const widthClass =
    size === "xlarge" ? "max-w-6xl" : size === "large" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${widthClass} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h3 id="admin-modal-title" className="text-lg font-bold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalCount <= 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p>
        Showing <span className="font-semibold text-slate-800">{from}</span>–
        <span className="font-semibold text-slate-800">{to}</span> of{" "}
        <span className="font-semibold text-slate-800">{totalCount}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnSecondary}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="min-w-[5.5rem] text-center font-medium text-slate-800">
          Page {page} / {safeTotalPages}
        </span>
        <button
          type="button"
          className={btnSecondary}
          disabled={disabled || page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
