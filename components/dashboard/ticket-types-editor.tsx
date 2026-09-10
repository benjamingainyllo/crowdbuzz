"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Loader2, Pencil, Trash2, Ticket, EyeOff, RotateCcw, X, ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKobo, koboToNaira } from "@/lib/money";
import {
  createTicketType,
  updateTicketType,
  removeTicketType,
  restoreTicketType,
  type TicketTypeInput,
} from "@/app/actions/ticket-types";
import { toast } from "sonner";

interface TicketTypeRow {
  id: string;
  name: string;
  description: string | null;
  price_kobo: number;
  quantity: number | null;
  sold_count: number;
  max_per_order: number;
  /* The sales window. Both are on the row already — the query selects
     "*" — and the type simply never named them, so the expanded detail
     could not read the two facts an organiser most often checks. */
  sales_start: string | null;
  sales_end: string | null;
  status: "active" | "hidden";
  sort_order: number;
}

const EMPTY_FORM: TicketTypeInput = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  maxPerOrder: "10",
};

/**
 * What the event actually sells.
 *
 * An event with no tiers can't sell anything, so this is the first thing
 * the organiser should see after creating one — the empty state says so
 * rather than just showing a blank list.
 */
export function TicketTypesEditor({ eventId }: { eventId: string }) {
  const [tiers, setTiers] = useState<TicketTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<TicketTypeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTiers = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");

      if (error) throw error;
      setTiers((data ?? []) as TicketTypeRow[]);
    } catch (error) {
      console.error("Could not load ticket types:", error);
      setLoadError("Couldn't load ticket types. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(tier: TicketTypeRow) {
    setForm({
      name: tier.name,
      description: tier.description ?? "",
      price: tier.price_kobo ? String(koboToNaira(tier.price_kobo)) : "0",
      quantity: tier.quantity === null ? "" : String(tier.quantity),
      maxPerOrder: String(tier.max_per_order),
    });
    setAdding(false);
    setEditingId(tier.id);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    setSaving(true);
    try {
      const result = editingId
        ? await updateTicketType(editingId, form)
        : await createTicketType(eventId, form);

      if (!result.success) {
        toast.error(result.error ?? "Could not save that ticket type.");
        return;
      }

      toast.success(editingId ? "Ticket type updated." : "Ticket type added.");
      cancel();
      await fetchTiers();
    } finally {
      setSaving(false);
    }
  }

  async function remove(tier: TicketTypeRow) {
    const sold = Number(tier.sold_count ?? 0);
    const message = sold
      ? `Stop selling "${tier.name}"? ${sold} already sold, so it stays on the books and those tickets keep working.`
      : `Delete "${tier.name}"?`;
    if (!window.confirm(message)) return;

    const result = await removeTicketType(tier.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not remove that ticket type.");
      return;
    }
    toast.success(sold ? "No longer on sale." : "Ticket type deleted.");
    await fetchTiers();
  }

  async function restore(tier: TicketTypeRow) {
    const result = await restoreTicketType(tier.id);
    if (!result.success) {
      toast.error(result.error ?? "Could not put that back on sale.");
      return;
    }
    toast.success("Back on sale.");
    await fetchTiers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-subtle">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-[8px] border border-[var(--dl-line)] bg-surface p-6 text-center">
        <p className="text-sm text-subtle">{loadError}</p>
        <button
          onClick={fetchTiers}
          className="mt-3 text-sm font-semibold text-[var(--dl-ink)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const active = tiers.filter((t) => t.status === "active");
  const hidden = tiers.filter((t) => t.status === "hidden");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">
            {active.length + hidden.length}{" "}
            {active.length + hidden.length === 1 ? "ticket tier" : "ticket tiers"}
          </h3>
          <p className="mt-0.5 text-[13px] text-[var(--dl-ink-soft)]">
            What people can buy. The cheapest active tier is the price shown on
            your event.
          </p>
        </div>
        {!adding && !editingId && (
          <button onClick={startAdd} className="dl-btn dl-btn-primary shrink-0">
            <Plus className="h-[15px] w-[15px]" />
            Add ticket tier
          </button>
        )}
      </div>

      {active.length === 0 && !adding && (
        <div className="rounded-[8px] border border-dashed border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[8px] bg-muted text-subtle">
            <Ticket className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-text">No ticket types yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-subtle">
            An event with no ticket types can&apos;t sell anything. Add one to
            put this event on sale.
          </p>
          <button
            onClick={startAdd}
            className="mt-4 rounded-[8px] bg-text px-4 py-2 text-xs font-bold text-background"
          >
            Add the first one
          </button>
        </div>
      )}

      {(adding || editingId) && (
        <TierForm
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={cancel}
          saving={saving}
          isEdit={Boolean(editingId)}
        />
      )}

      {active.length > 0 && (
        <div className="dl-card overflow-hidden">
          {/* A header row, so the numbers down each column have a name.
              Hidden on a phone, where the rows stack into labelled pairs
              and a five-column header would be a horizontal scroll for
              no gain. */}
          <div className="hidden items-center gap-3 border-b border-[var(--dl-line)] bg-[#FAFBFB] px-4 py-2.5 text-[11.5px] font-bold text-[var(--dl-ink-faint)] sm:flex">
            <span className="w-[18px] shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">Tier</span>
            <span className="w-[92px] shrink-0">Status</span>
            <span className="w-[104px] shrink-0 text-right">Available</span>
            <span className="w-[104px] shrink-0 text-right">Price</span>
            <span className="w-[72px] shrink-0" aria-hidden="true" />
          </div>

          {active.map((tier) =>
            editingId === tier.id ? null : (
              <TierRow
                key={tier.id}
                tier={tier}
                onEdit={() => startEdit(tier)}
                onRemove={() => remove(tier)}
              />
            )
          )}
        </div>
      )}

      {hidden.length > 0 && (
        <div className="dl-card overflow-hidden">
          <div className="border-b border-[var(--dl-line)] bg-[#FAFBFB] px-4 py-2.5 text-[11.5px] font-bold text-[var(--dl-ink-faint)]">
            No longer on sale
          </div>
          {hidden.map((tier) => (
            <TierRow key={tier.id} tier={tier} onRestore={() => restore(tier)} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One tier, as a row that opens.
 *
 * THE ROW IS THE SUMMARY; THE DETAIL IS BEHIND IT. A tier carries nine
 * facts — price, cap, sold, max per order, both sales windows, its
 * description, its state — and printing all nine on every row made four
 * tiers into a wall nobody could scan. The row now answers the four
 * questions somebody actually arrives with (which tier, is it selling,
 * how many are left, what does it cost) and the rest is one click away.
 *
 * IT IS A BUTTON, NOT A DIV WITH AN onClick. Keyboard focus, Enter and
 * Space, and a screen reader announcing "expanded" all come free from
 * using the right element; none of them come from a handler on a div.
 */
/* Exported so the row can be rendered against fixtures — a long tier
   name, a sold-out tier, an unlimited one — without a database. */
export function TierRow({
  tier,
  onEdit,
  onRemove,
  onRestore,
}: {
  tier: TicketTypeRow;
  onEdit?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const sold = Number(tier.sold_count ?? 0);
  const cap = tier.quantity;
  const soldOut = cap !== null && sold >= cap;
  const left = cap === null ? null : Math.max(0, cap - sold);

  const now = Date.now();
  const startsAt = tier.sales_start ? new Date(tier.sales_start).getTime() : null;
  const endsAt = tier.sales_end ? new Date(tier.sales_end).getTime() : null;

  // The same order the buyer's page resolves these in, so an organiser
  // never sees "On sale" here against a tier a buyer cannot reach.
  const state = (() => {
    if (tier.status === "hidden") return { label: "Hidden", tone: "flat" as const };
    if (soldOut) return { label: "Sold out", tone: "bad" as const };
    if (startsAt && now < startsAt) return { label: "Upcoming", tone: "warn" as const };
    if (endsAt && now > endsAt) return { label: "Closed", tone: "flat" as const };
    return { label: "On sale", tone: "ok" as const };
  })();

  const TONES = {
    ok: "border-[#B7E4CB] bg-[#EDF9F2] text-[#146B45]",
    warn: "border-[#F3DCA6] bg-[#FDF6E7] text-[#7A5000]",
    bad: "border-[#F5C2CE] bg-[#FDEEF1] text-[#B32243]",
    flat: "border-[var(--dl-line)] bg-[#F6F7F8] text-[var(--dl-ink-soft)]",
  };

  const when = (v: string | null | undefined) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-NG", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  return (
    <div className={`border-b border-[var(--dl-line-soft)] last:border-b-0 ${tier.status === "hidden" ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? `Hide ${tier.name} details` : `Show ${tier.name} details`}
          className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] text-[var(--dl-ink-faint)] transition-colors hover:text-[var(--dl-ink)]"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
            strokeWidth={2.5}
          />
        </button>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[14px] font-bold">{tier.name}</span>
          <span className="mt-0.5 block text-[12px] text-[var(--dl-ink-faint)] sm:hidden">
            {tier.price_kobo === 0 ? "Free" : formatKobo(tier.price_kobo)}
            {" · "}
            {left === null ? "Unlimited" : `${left} left`}
          </span>
        </button>

        <span className={`hidden w-[92px] shrink-0 sm:block`}>
          <span
            className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-[2px] text-[11px] font-bold ${TONES[state.tone]}`}
          >
            {state.label}
          </span>
        </span>

        <span className="hidden w-[104px] shrink-0 text-right text-[13.5px] font-semibold [font-variant-numeric:tabular-nums] sm:block">
          {cap === null ? (
            <span className="text-[var(--dl-ink-faint)]">Unlimited</span>
          ) : (
            <>
              {sold}
              <span className="text-[var(--dl-ink-faint)]">/{cap}</span>
            </>
          )}
        </span>

        <span className="hidden w-[104px] shrink-0 text-right text-[13.5px] font-extrabold [font-variant-numeric:tabular-nums] sm:block">
          {tier.price_kobo === 0 ? "Free" : formatKobo(tier.price_kobo)}
        </span>

        <span className="flex w-[72px] shrink-0 items-center justify-end gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Edit ${tier.name}`}
              className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--dl-ink-faint)] transition-colors hover:bg-[#F1F2F4] hover:text-[var(--dl-ink)]"
            >
              <Pencil className="h-[15px] w-[15px]" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label={`Remove ${tier.name}`}
              className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--dl-ink-faint)] transition-colors hover:bg-[#FDEEF1] hover:text-[var(--dl-danger)]"
            >
              <Trash2 className="h-[15px] w-[15px]" />
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              aria-label={`Put ${tier.name} back on sale`}
              className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--dl-ink-faint)] transition-colors hover:bg-[#F1F2F4] hover:text-[var(--dl-ink)]"
            >
              <RotateCcw className="h-[15px] w-[15px]" />
            </button>
          )}
        </span>
      </div>

      {open && (
        <div className="border-t border-[var(--dl-line-soft)] bg-[#FAFBFB] px-4 py-4 sm:pl-[45px]">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              ["Price", tier.price_kobo === 0 ? "Free" : formatKobo(tier.price_kobo)],
              ["Quantity available", cap === null ? "Unlimited" : `${cap}`],
              ["Sold", `${sold}`],
              ["Max per order", `${tier.max_per_order ?? 10}`],
              ["Sales open", when(tier.sales_start)],
              ["Sales close", when(tier.sales_end)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11.5px] font-bold text-[var(--dl-ink-faint)]">{k}</dt>
                <dd className="mt-0.5 text-[13.5px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {tier.description && (
            <div className="mt-4">
              <p className="text-[11.5px] font-bold text-[var(--dl-ink-faint)]">Description</p>
              <p className="mt-0.5 max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                {tier.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TierForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isEdit,
}: {
  form: TicketTypeInput;
  setForm: (f: TicketTypeInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const field =
    "dl-field w-full text-sm text-text placeholder:text-subtle focus:border-[var(--dl-line)] focus:outline-none";

  return (
    <div className="rounded-[8px] border border-[#FF6A4566] bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-text">
          {isEdit ? "Edit ticket type" : "New ticket type"}
        </h4>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-subtle hover:bg-muted hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Early Bird"
            className={field}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">
            Description <span className="font-normal">(optional)</span>
          </label>
          <input
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Includes a drink on arrival"
            className={field}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-subtle">Price (₦)</label>
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className={field}
            />
            <p className="mt-1 text-[11px] text-subtle">0 for a free ticket.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-subtle">How many</label>
            <input
              value={form.quantity ?? ""}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              inputMode="numeric"
              placeholder="Unlimited"
              className={field}
            />
            <p className="mt-1 text-[11px] text-subtle">Blank for no limit.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-subtle">Max per order</label>
            <input
              value={form.maxPerOrder ?? ""}
              onChange={(e) => setForm({ ...form, maxPerOrder: e.target.value })}
              inputMode="numeric"
              placeholder="10"
              className={field}
            />
            <p className="mt-1 text-[11px] text-subtle">Per checkout.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-[8px] bg-text px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save changes" : "Add ticket type"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-[8px] px-3 py-2 text-xs font-semibold text-subtle hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
