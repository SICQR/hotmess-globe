import { z } from "zod";

const Id = z.string().min(1);
const NonEmpty = z.string().min(1);

const VisibilityLevelId = z.enum(["public", "matches", "nobody"]);

const BooleanField = z.object({
  id: Id,
  type: z.literal("boolean"),
  label: NonEmpty,
  default: z.boolean()
});

const RangeField = z.object({
  id: Id,
  type: z.literal("range"),
  label: NonEmpty,
  min: z.number(),
  max: z.number(),
  step: z.number(),
  default: z.union([z.tuple([z.number(), z.number()]), z.null()])
});

const SingleSelectField = z.object({
  id: Id,
  type: z.literal("single_select"),
  label: NonEmpty,
  options: z.array(NonEmpty).min(1),
  default: z.union([NonEmpty, z.null()]).optional()
});

const MultiSelectField = z.object({
  id: Id,
  type: z.literal("multi_select"),
  label: NonEmpty,
  options: z.array(NonEmpty).min(1),
  default: z.array(NonEmpty)
});

const MultiSelectRefField = z.object({
  id: Id,
  type: z.literal("multi_select_ref"),
  label: NonEmpty,
  ref: z.enum(["tribes", "tags"]),
  default: z.array(Id),
  allowedTagCategoryIds: z.array(Id).optional(),
  allowedTagIds: z.array(Id).optional()
});

const FilterField = z.discriminatedUnion("type", [
  BooleanField,
  RangeField,
  SingleSelectField,
  MultiSelectField,
  MultiSelectRefField
]);

const FiltersSchema = z.object({
  quickToggles: z.array(BooleanField).min(1),
  groups: z.array(z.object({ id: Id, label: NonEmpty, fields: z.array(FilterField).min(1) })).min(1),
  presets: z.array(z.object({ id: Id, label: NonEmpty, laneId: Id, values: z.record(z.any()) })).min(1)
});

export const DiscoveryTaxonomySchema = z.object({
  meta: z.object({
    id: Id,
    version: NonEmpty,
    generatedAt: NonEmpty,
    timezone: NonEmpty,
    locale: NonEmpty
  }),
  privacy: z.object({
    visibilityLevels: z.array(z.object({ id: VisibilityLevelId, label: NonEmpty })).min(1),
    defaults: z.object({
      substancesVisibility: VisibilityLevelId,
      healthVisibility: VisibilityLevelId,
      aftercareVisibility: VisibilityLevelId,
      essentialsVisibility: VisibilityLevelId,
      statsVisibility: VisibilityLevelId,
      distanceVisibility: VisibilityLevelId
    })
  }),
  lanes: z.array(z.object({ id: Id, label: NonEmpty, description: NonEmpty, defaultPresetId: Id })).min(1),
  filters: FiltersSchema,
  tribes: z.array(z.object({ id: Id, label: NonEmpty })).min(1),
  tagCategories: z.array(z.object({ id: Id, label: NonEmpty })).min(1),
  tags: z.array(z.object({ id: Id, label: NonEmpty, categoryId: Id, isSensitive: z.boolean() })).min(1),
  synonyms: z.array(z.object({ input: NonEmpty, tagId: Id })).default([]),
  profile: z.any(),
  compatibility: z.any(),
  compliance: z.any(),
  moderation: z.any(),
  navigation: z.object({
    routes: z.array(z.object({ id: Id, label: NonEmpty, path: NonEmpty })).min(1),
    contextLinks: z.array(z.object({ context: Id, routeId: Id, label: NonEmpty })).min(1)
  })
});

export function loadDiscoveryTaxonomy(input) {
  return DiscoveryTaxonomySchema.parse(input);
}

export function buildTaxonomyIndex(cfg) {
  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/['']/g, "'");

  const tagsById = new Map(cfg.tags.map((t) => [t.id, t]));
  const tribesById = new Map(cfg.tribes.map((t) => [t.id, t]));
  const categoriesById = new Map(cfg.tagCategories.map((c) => [c.id, c]));
  const presetsById = new Map(cfg.filters.presets.map((p) => [p.id, p]));
  const routesById = new Map(cfg.navigation.routes.map((r) => [r.id, r]));

  const synonymToTagId = new Map();
  for (const s of cfg.synonyms) synonymToTagId.set(normalize(s.input), s.tagId);

  return {
    normalize,
    tagsById,
    tribesById,
    categoriesById,
    presetsById,
    routesById,
    synonymToTagId,
    resolveTagIdFromInput: (raw) => synonymToTagId.get(normalize(raw)) || null
  };
}