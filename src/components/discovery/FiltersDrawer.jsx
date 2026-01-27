import React, { useEffect, useMemo, useState } from "react";
import { useTaxonomy } from "../taxonomy/useTaxonomy";
import { createPageUrl } from "../../utils";

const LS_KEY = "hm_saved_presets_v1";

function clsx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function uid(prefix = "preset") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function TagPill({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "border-2 px-3 py-1 text-xs font-bold uppercase tracking-wider transition",
        active ? "bg-black text-white border-black" : "bg-white text-black border-black/20 hover:border-black"
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={onClick}
      className={clsx(
        "h-7 w-12 border-2 transition relative",
        checked ? "bg-black border-black" : "bg-white border-black/20"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 bg-white shadow-sm transition border border-black/20",
          checked ? "left-5" : "left-0.5"
        )}
      />
    </button>
  );
}

function RefMultiSelectField({
  field,
  cfg,
  idx,
  selected,
  setVal,
  q,
  setQ,
}) {
  const items = useMemo(() => {
    if (field.ref === "tribes") {
      return cfg.tribes.map((t) => ({ id: t.id, label: t.label, isSensitive: false }));
    }

    let tags = cfg.tags;

    if (Array.isArray(field.allowedTagCategoryIds) && field.allowedTagCategoryIds.length > 0) {
      const allowSet = new Set(field.allowedTagCategoryIds);
      tags = tags.filter((t) => allowSet.has(t.categoryId));
    }
    if (Array.isArray(field.allowedTagIds) && field.allowedTagIds.length > 0) {
      const allowSet = new Set(field.allowedTagIds);
      tags = tags.filter((t) => allowSet.has(t.id));
    }

    return tags.map((t) => ({ id: t.id, label: t.label, isSensitive: !!t.isSensitive }));
  }, [field.ref, field.allowedTagCategoryIds, field.allowedTagIds, cfg.tribes, cfg.tags]);

  const filtered = useMemo(() => {
    const qq = idx.normalize(q);
    if (!qq) return items;
    return items.filter((it) => idx.normalize(it.label).includes(qq));
  }, [items, q, idx]);

  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setVal(field.id, next);
  };

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-end justify-between gap-2">
        <div className="text-sm font-medium text-zinc-900">{field.label}</div>
        <div className="text-xs text-zinc-600">{selected.length} selected</div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(field.id, e.target.value)}
        placeholder="Search…"
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
      />

      <div className="flex flex-wrap gap-2 max-h-56 overflow-auto pr-1">
        {filtered.slice(0, 140).map((it) => (
          <TagPill
            key={it.id}
            active={selected.includes(it.id)}
            onClick={() => toggle(it.id)}
            title={it.isSensitive ? "Sensitive tag (private by default)" : undefined}
          >
            <span className="inline-flex items-center gap-2">
              {it.label}
              {it.isSensitive && (
                <span className="text-[10px] rounded-full border px-2 py-0.5 opacity-80">
                  Private default
                </span>
              )}
            </span>
          </TagPill>
        ))}
      </div>

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => setVal(field.id, [])}
          className="text-xs underline underline-offset-4 text-zinc-600 hover:text-zinc-900"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}

export default function FiltersDrawer({
  open,
  onClose,
  laneId,
  onApply,
  initialValues,
}) {
  const { cfg, idx } = useTaxonomy();

  const go = (path) => {
    window.location.href = createPageUrl(path);
  };

  const defaults = useMemo(() => {
    const d = {};

    for (const t of cfg.filters.quickToggles) d[t.id] = t.default;

    for (const g of cfg.filters.groups) {
      for (const f of g.fields) {
        if (typeof f.default !== "undefined") d[f.id] = f.default;
        else {
          if (f.type === "boolean") d[f.id] = false;
          if (f.type === "multi_select" || f.type === "multi_select_ref") d[f.id] = [];
          if (f.type === "single_select") d[f.id] = null;
          if (f.type === "range") d[f.id] = null;
        }
      }
    }
    return d;
  }, [cfg.filters.groups, cfg.filters.quickToggles]);

  const builtInPresets = useMemo(
    () => cfg.filters.presets.filter((p) => p.laneId === laneId),
    [cfg.filters.presets, laneId]
  );

  const [savedPresets, setSavedPresets] = useState([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedPresets(parsed.filter((p) => p.laneId === laneId));
    } catch {
      setSavedPresets([]);
    }
  }, [laneId]);

  const allPresets = useMemo(() => {
    const savedAsConfig = savedPresets.map((p) => ({ ...p, __saved: true }));
    const builtAsConfig = builtInPresets.map((p) => ({ ...p, __saved: false }));
    return [...builtAsConfig, ...savedAsConfig];
  }, [builtInPresets, savedPresets]);

  const [activePresetId, setActivePresetId] = useState(null);
  const [values, setValues] = useState({});
  const [openGroupId, setOpenGroupId] = useState(cfg.filters.groups[0]?.id ?? null);

  // per-field search queries for ref fields
  const [refQs, setRefQs] = useState({});

  const setRefQ = (fieldId, next) => setRefQs((s) => ({ ...s, [fieldId]: next }));

  useEffect(() => {
    if (!open) return;

    const laneDefaultPresetId = cfg.lanes.find((l) => l.id === laneId)?.defaultPresetId ?? null;
    const laneDefaultPreset = cfg.filters.presets.find((p) => p.id === laneDefaultPresetId) ?? null;

    const start = {
      ...defaults,
      ...(laneDefaultPreset?.values ?? {}),
      ...(initialValues ?? {})
    };

    setValues(start);
    setActivePresetId(laneDefaultPresetId);
    setOpenGroupId(cfg.filters.groups[0]?.id ?? null);
    setRefQs({});
  }, [open, laneId, defaults, initialValues, cfg.lanes, cfg.filters.presets, cfg.filters.groups]);

  const setVal = (id, next) => {
    setValues((v) => ({ ...v, [id]: next }));
    setActivePresetId(null);
  };

  const toggleBool = (id) => setVal(id, !values[id]);

  const clearAll = () => {
    setValues({ ...defaults });
    setActivePresetId(null);
    setRefQs({});
  };

  const loadPreset = (presetId) => {
    const p = allPresets.find((x) => x.id === presetId);
    if (!p) return;
    setActivePresetId(presetId);
    setValues({ ...defaults, ...(p.values ?? {}) });
    setRefQs({});
  };

  const savePreset = () => {
    const label = window.prompt("Preset name?");
    if (!label) return;

    const preset = {
      id: uid("preset"),
      label: label.trim().slice(0, 48),
      laneId,
      values,
      createdAt: Date.now()
    };

    const nextAll = (() => {
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return [preset, ...parsed].slice(0, 50);
      } catch {
        return [preset];
      }
    })();

    window.localStorage.setItem(LS_KEY, JSON.stringify(nextAll));
    setSavedPresets(nextAll.filter((p) => p.laneId === laneId));
    setActivePresetId(preset.id);
  };

  const apply = () => {
    // Deduplicate include/exclude tribes if both exist
    const includeId = "tribeInclude";
    const excludeId = "tribeExclude";

    if (Array.isArray(values[includeId]) && Array.isArray(values[excludeId])) {
      const inc = new Set(values[includeId]);
      const cleanedExclude = values[excludeId].filter((id) => !inc.has(id));
      if (cleanedExclude.length !== values[excludeId].length) {
        const next = { ...values, [excludeId]: cleanedExclude };
        setValues(next);
        onApply(next);
        onClose();
        return;
      }
    }

    onApply(values);
    onClose();
  };

  const footerLinks = useMemo(() => {
    const byId = new Map(cfg.navigation.routes.map((r) => [r.id, r]));
    const want = ["care", "shop", "radio", "affiliate"];
    return want.map((id) => byId.get(id)).filter(Boolean).map((r) => ({ label: r.label, path: r.path }));
  }, [cfg.navigation.routes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        type="button"
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
          <div>
            <div className="text-lg font-black uppercase tracking-wider text-black">Filters</div>
            <div className="text-xs uppercase tracking-widest text-black/60">Pick your lane. Keep it respectful.</div>
          </div>
          <button type="button" onClick={onClose} className="border-2 border-black px-3 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white transition">
            Close
          </button>
        </div>

        <div className="h-[calc(100%-148px)] overflow-auto px-5 py-4">
          {/* Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-black">Presets</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {allPresets.map((p) => (
                <TagPill
                  key={p.id}
                  active={activePresetId === p.id}
                  onClick={() => loadPreset(p.id)}
                  title={p.__saved ? "Saved preset" : "Built-in preset"}
                >
                  {p.label}
                </TagPill>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={savePreset} className="border-2 border-black px-4 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white transition">
                Save as preset
              </button>
              <button type="button" onClick={clearAll} className="border-2 border-black px-4 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white transition">
                Clear all
              </button>
            </div>
          </div>

          {/* Quick toggles */}
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-black">Quick toggles</h3>
            <div className="space-y-1">
              {cfg.filters.quickToggles.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="text-xs uppercase tracking-wide font-bold text-black">{t.label}</div>
                  <Toggle checked={!!values[t.id]} onClick={() => toggleBool(t.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* Groups accordion */}
          <div className="mt-6 space-y-3">
            {cfg.filters.groups.map((g) => {
              const isOpen = openGroupId === g.id;

              return (
                <div key={g.id} className="border-2 border-black">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 bg-white hover:bg-black/5 transition"
                    onClick={() => setOpenGroupId(isOpen ? null : g.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="text-xs font-black uppercase tracking-widest text-black">{g.label}</div>
                    <div className="text-[10px] font-bold uppercase text-black/60">{isOpen ? "Hide" : "Show"}</div>
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-black px-4 py-3">
                      {g.fields.map((f) => {
                        // boolean
                        if (f.type === "boolean") {
                          return (
                            <div key={f.id} className="flex items-center justify-between gap-3 py-2">
                              <div className="text-sm text-zinc-900">{f.label}</div>
                              <Toggle checked={!!values[f.id]} onClick={() => toggleBool(f.id)} />
                            </div>
                          );
                        }

                        // range (simple min/max inputs)
                        if (f.type === "range") {
                          const val = values[f.id] ?? null;
                          const a = val ? val[0] : f.min;
                          const b = val ? val[1] : f.max;

                          return (
                            <div key={f.id} className="space-y-2 py-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-zinc-900">{f.label}</div>
                                <div className="text-xs text-zinc-600">{val ? `${a} – ${b}` : "Any"}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="space-y-1">
                                  <div className="text-xs text-zinc-600">Min</div>
                                  <input
                                    type="number"
                                    min={f.min}
                                    max={f.max}
                                    step={f.step}
                                    value={a}
                                    onChange={(e) => {
                                      const nextA = Number(e.target.value);
                                      setVal(f.id, [Math.min(nextA, b), b]);
                                    }}
                                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <div className="text-xs text-zinc-600">Max</div>
                                  <input
                                    type="number"
                                    min={f.min}
                                    max={f.max}
                                    step={f.step}
                                    value={b}
                                    onChange={(e) => {
                                      const nextB = Number(e.target.value);
                                      setVal(f.id, [a, Math.max(nextB, a)]);
                                    }}
                                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
                                  />
                                </label>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => setVal(f.id, null)}
                                  className="text-xs underline underline-offset-4 text-zinc-600 hover:text-zinc-900"
                                >
                                  Any
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVal(f.id, [f.min, f.max])}
                                  className="text-xs underline underline-offset-4 text-zinc-600 hover:text-zinc-900"
                                >
                                  Full range
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // single_select
                        if (f.type === "single_select") {
                          return (
                            <div key={f.id} className="space-y-2 py-2">
                              <div className="text-sm font-medium text-zinc-900">{f.label}</div>
                              <div className="flex flex-wrap gap-2">
                                {f.options.map((opt) => (
                                  <TagPill
                                    key={opt}
                                    active={values[f.id] === opt}
                                    onClick={() => setVal(f.id, values[f.id] === opt ? null : opt)}
                                  >
                                    {opt}
                                  </TagPill>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // multi_select
                        if (f.type === "multi_select") {
                          const arr = Array.isArray(values[f.id]) ? values[f.id] : [];
                          const toggle = (opt) =>
                            setVal(f.id, arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);

                          return (
                            <div key={f.id} className="space-y-2 py-2">
                              <div className="text-sm font-medium text-zinc-900">{f.label}</div>
                              <div className="flex flex-wrap gap-2">
                                {f.options.map((opt) => (
                                  <TagPill key={opt} active={arr.includes(opt)} onClick={() => toggle(opt)}>
                                    {opt}
                                  </TagPill>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // multi_select_ref (tribes/tags)
                        if (f.type === "multi_select_ref") {
                          const selected = Array.isArray(values[f.id]) ? values[f.id] : [];
                          const q = refQs[f.id] ?? "";

                          return (
                            <div key={f.id}>
                              <RefMultiSelectField
                                field={f}
                                cfg={cfg}
                                idx={idx}
                                selected={selected}
                                setVal={setVal}
                                q={q}
                                setQ={setRefQ}
                              />
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer links */}
          <div className="mt-8 border-2 border-black bg-black p-4">
            <div className="text-sm font-black text-white uppercase tracking-wider mb-3">
              SHOP THE DROP
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => go("Marketplace")}
                className="bg-white text-black px-3 py-2 text-xs font-black uppercase border-2 border-white hover:bg-black hover:text-white hover:border-white transition"
              >
                SHOP RAW
              </button>
              <button
                type="button"
                onClick={() => go("Radio")}
                className="bg-[#E62020] text-black px-3 py-2 text-xs font-black uppercase border-2 border-[#E62020] hover:bg-black hover:text-[#E62020] transition"
              >
                RADIO
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {footerLinks.map((l) => (
                <button
                  key={l.path}
                  type="button"
                  onClick={() => go(l.path)}
                  className="border-2 border-white/60 text-white px-3 py-1 text-[10px] font-black uppercase hover:bg-white hover:text-black transition"
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-wider text-white/60">
              Filters find bodies. Compatibility finds good nights.
            </div>
          </div>
        </div>

        <div className="border-t-2 border-black px-5 py-4">
          <button
            type="button"
            onClick={apply}
            className="w-full bg-[#E62020] px-4 py-4 text-sm font-black uppercase tracking-widest text-black hover:bg-black hover:text-white transition-all"
          >
            Apply filters
          </button>
          <div className="mt-2 text-center text-xs uppercase tracking-wider text-black/60">Right Now ends automatically. No ghost status.</div>
        </div>
      </div>
    </div>
  );
}