"use client";

import { labelForPlanOption } from "@/lib/constants";
import { ConfigRecord } from "@/lib/types";
import {
  ArrowRight,
  Check,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  Pencil,
  Trash2,
  FileInput,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

type Props = {
  configs: ConfigRecord[];
};

export function ConfigsTable({ configs }: Props) {
  const router = useRouter();
  const { status } = useSession();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConfigRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportConfirm, setExportConfirm] = useState<ConfigRecord | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState<{ url: string; title: string } | null>(null);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function copyPassword(configId: string, password: string) {
    await copy(password);
    setCopiedId(configId);
    window.setTimeout(() => {
      setCopiedId((current) => (current === configId ? null : current));
    }, 1000);
  }

  async function confirmDelete(config: ConfigRecord) {
    setDeleteError(null);
    setDeletingId(config.Config_ID);
    try {
      const response = await fetch(`/api/configs/${encodeURIComponent(config.Config_ID)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = "Unable to delete config.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* ignore */
        }
        setDeleteError(message);
        return;
      }

      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError("Network error while deleting. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function runExport(config: ConfigRecord) {
    setExportError(null);
    setExportingId(config.Config_ID);
    try {
      const response = await fetch(
        `/api/configs/${encodeURIComponent(config.Config_ID)}/export-om-notes`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { data?: { url: string; title: string }; error?: string };
      if (!response.ok) {
        setExportError(payload.error ?? "Export failed.");
        return;
      }
      if (!payload.data?.url) {
        setExportError("Export succeeded but no document URL was returned.");
        return;
      }
      setExportConfirm(null);
      setExportDone({ url: payload.data.url, title: payload.data.title });
      router.refresh();
    } catch {
      setExportError("Network error while exporting. Try again.");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#d7ccf6] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-base">
            <thead className="bg-[#f6efff] text-left text-[#2c1650]">
              <tr>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Industry</th>
                <th className="px-3 py-3">Plan Package</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const isDeleting = deletingId === config.Config_ID;
                const isExporting = exportingId === config.Config_ID;
                const docUrl = config.handoffDocUrl?.trim();
                return (
                  <tr
                    key={config.Config_ID}
                    className={`border-t border-[#ebe4ff] ${isDeleting ? "bg-[#faf8ff]" : ""}`}
                    aria-busy={isDeleting}
                  >
                    <td className="px-3 py-3 font-medium">{config.Title}</td>
                    <td className="px-3 py-3">{config.Industry}</td>
                    <td className="px-3 py-3">{labelForPlanOption(config.planOptionId)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          title="Copy this account's guest password to your clipboard"
                          aria-label="Copy this account's guest password to your clipboard"
                          disabled={isDeleting}
                          className="rounded-md border border-[#d4c9f6] p-2.5 text-[#4a2b7a] hover:bg-[#f2e8ff] disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => copyPassword(config.Config_ID, config.Password)}
                        >
                          {copiedId === config.Config_ID ? <Check size={18} /> : <KeyRound size={18} />}
                        </button>
                        <Link
                          title="Edit account settings: title, industry, duration, product type, and password"
                          aria-label="Edit account settings: title, industry, duration, product type, and password"
                          href={`/employee/configs/${encodeURIComponent(config.Config_ID)}/edit`}
                          className="rounded-md border border-[#d4c9f6] p-2.5 text-[#4a2b7a] hover:bg-[#f2e8ff]"
                          aria-disabled={isDeleting}
                          tabIndex={isDeleting ? -1 : undefined}
                          onClick={(e) => {
                            if (isDeleting) e.preventDefault();
                          }}
                        >
                          <Pencil size={18} />
                        </Link>
                        <Link
                          title="Open the onboarding timeline canvas for this account"
                          aria-label="Open the onboarding timeline canvas for this account"
                          href={`/employee/configs/${encodeURIComponent(config.Config_ID)}`}
                          className="rounded-md border border-[#d4c9f6] p-2.5 text-[#4a2b7a] hover:bg-[#f2e8ff]"
                          aria-disabled={isDeleting}
                          tabIndex={isDeleting ? -1 : undefined}
                          onClick={(e) => {
                            if (isDeleting) e.preventDefault();
                          }}
                        >
                          <ArrowRight size={18} />
                        </Link>
                        <button
                          type="button"
                          title="Export OM hand-off notes to a new Google Doc"
                          aria-label="Export OM hand-off notes to a new Google Doc"
                          disabled={isDeleting || isExporting || status !== "authenticated"}
                          onClick={() => {
                            setExportError(null);
                            setExportConfirm(config);
                          }}
                          className="rounded-md border border-[#c9e8d4] p-2.5 text-[#1f6b3f] transition hover:bg-[#ecfdf3] disabled:pointer-events-none disabled:opacity-50"
                        >
                          {isExporting ? (
                            <Loader2 size={18} className="animate-spin" aria-hidden />
                          ) : (
                            <FileInput size={18} aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          title={
                            docUrl
                              ? "Open the last exported hand-off Google Doc"
                              : "Export once to create a doc; then you can reopen it here"
                          }
                          aria-label="View exported hand-off Google Doc"
                          disabled={isDeleting || !docUrl}
                          onClick={() => docUrl && window.open(docUrl, "_blank", "noopener,noreferrer")}
                          className={[
                            "relative inline-flex rounded-md border p-2.5 transition",
                            docUrl
                              ? "border-[#d4c9f6] text-[#4a2b7a] hover:bg-[#f2e8ff]"
                              : "cursor-not-allowed border-[#e8e4f0] text-[#b8b0c9]",
                          ].join(" ")}
                        >
                          <FileText size={18} className="opacity-90" aria-hidden />
                          <Eye
                            size={11}
                            className="absolute -bottom-0.5 -right-0.5 rounded-sm bg-white text-[#801ED7] ring-1 ring-[#e8e4f0]"
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          title="Delete this account and all of its timeline tiles (cannot be undone)"
                          aria-label="Delete this account and all of its timeline tiles (cannot be undone)"
                          disabled={!!deletingId}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(config);
                          }}
                          className="rounded-md border border-[#f1c4cc] p-2.5 text-[#b5334d] hover:bg-[#fff1f4] disabled:pointer-events-none disabled:opacity-60"
                        >
                          {isDeleting ? (
                            <Loader2 size={18} className="animate-spin" aria-hidden />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                        {isDeleting && (
                          <span className="text-sm text-[#6B5A9A]" aria-live="polite">
                            Deleting…
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!configs.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-base text-[#6B5A9A]">
                    No configs yet. Create one to seed the first timeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {exportConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !exportingId) setExportConfirm(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-om-title"
            className="w-full max-w-md rounded-2xl border border-[#d7ccf6] bg-white p-6 shadow-xl"
          >
            <h2 id="export-om-title" className="text-xl font-semibold text-[#2c1650]">
              Export to Google Doc?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#4a3b6d]">
              A new Google Doc will be created in your Drive with onboarding notes and edited tiles for{" "}
              <span className="font-medium">{exportConfirm.Title}</span>. You can reopen the latest export with the
              view button in the row after it finishes.
            </p>
            {exportError && (
              <p className="mt-3 rounded-lg bg-[#fff1f4] px-3 py-2 text-sm text-[#b5334d]" role="alert">
                {exportError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={!!exportingId}
                className="rounded-lg border border-[#d4c9f6] px-4 py-2.5 text-base font-medium text-[#4a2b7a] hover:bg-[#f6efff] disabled:opacity-50"
                onClick={() => !exportingId && setExportConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!exportingId}
                className="inline-flex items-center gap-2 rounded-lg bg-[#801ED7] px-4 py-2.5 text-base font-medium text-white hover:bg-[#6b18b8] disabled:opacity-70"
                onClick={() => void runExport(exportConfirm)}
              >
                {exportingId === exportConfirm.Config_ID ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Create doc"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {exportDone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExportDone(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-done-title"
            className="w-full max-w-md rounded-2xl border border-[#d7ccf6] bg-white p-6 shadow-xl"
          >
            <h2 id="export-done-title" className="text-xl font-semibold text-[#2c1650]">
              Export complete
            </h2>
            <p className="mt-2 text-sm text-[#6B5A9A]">{exportDone.title}</p>
            <p className="mt-4 text-base text-[#4a3b6d]">
              <a
                href={exportDone.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#801ED7] underline decoration-[#801ED7]/40 underline-offset-2 hover:decoration-[#801ED7]"
              >
                Open in Google Docs
              </a>
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-lg bg-[#801ED7] px-4 py-2.5 text-base font-medium text-white hover:bg-[#6b18b8]"
                onClick={() => setExportDone(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingId) setDeleteTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-config-title"
            className="w-full max-w-md rounded-2xl border border-[#d7ccf6] bg-white p-6 shadow-xl"
          >
            <h2 id="delete-config-title" className="text-xl font-semibold text-[#2c1650]">
              Delete config?
            </h2>
            <p className="mt-3 text-base text-[#4a3b6d]">
              <span className="font-medium">{deleteTarget.Title}</span> and all of its timeline tiles will be
              permanently removed from Caboodle. This cannot be undone.
            </p>
            <p className="mt-3 text-sm text-[#6B5A9A]">
              Related tiles are cleaned up automatically in the background after this config is removed.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-lg bg-[#fff1f4] px-3 py-2 text-base text-[#b5334d]" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={!!deletingId}
                className="rounded-lg border border-[#d4c9f6] px-4 py-2.5 text-base font-medium text-[#4a2b7a] hover:bg-[#f6efff] disabled:opacity-50"
                onClick={() => !deletingId && setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                className="inline-flex items-center gap-2 rounded-lg bg-[#b5334d] px-4 py-2.5 text-base font-medium text-white hover:bg-[#9c2a42] disabled:opacity-70"
                onClick={() => confirmDelete(deleteTarget)}
              >
                {deletingId === deleteTarget.Config_ID ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
