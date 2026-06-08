/**
 * useFilterState — single source of truth for the /domains advanced filter
 * panel. Holds criteria, syncs them with the URL query string for shareable
 * deep-links, and exposes helpers used by FilterPanel and the page itself.
 *
 * Criteria shape is also used as the JSON payload stored in saved_filters.
 */

export interface DomainFilterCriteria {
  search: string;
  status: string; // '' | 'ALL' | 'AVAILABLE' | 'REGISTERED' | 'EXPIRING' | 'PENDING_DELETE'
  watchKind: string; // '' | 'OWNED' | 'WANTED'
  priority: string; // '' | 'HIGH' | 'MEDIUM' | 'LOW'
  groupName: string;
  tags: string[];
  sslState: string; // '' | 'expiring' | 'invalid' | 'none'
  expiringDays: number | null; // domains expiring within N days
}

export const emptyFilterCriteria = (): DomainFilterCriteria => ({
  search: "",
  status: "",
  watchKind: "",
  priority: "",
  groupName: "",
  tags: [],
  sslState: "",
  expiringDays: null,
});

const isEmpty = (c: DomainFilterCriteria) =>
  !c.search &&
  (!c.status || c.status === "ALL") &&
  !c.watchKind &&
  !c.priority &&
  !c.groupName &&
  c.tags.length === 0 &&
  !c.sslState &&
  c.expiringDays == null;

const toQuery = (c: DomainFilterCriteria): Record<string, string> => {
  const q: Record<string, string> = {};
  if (c.search) q.search = c.search;
  if (c.status && c.status !== "ALL") q.status = c.status;
  if (c.watchKind) q.watchKind = c.watchKind;
  if (c.priority) q.priority = c.priority;
  if (c.groupName) q.group = c.groupName;
  if (c.tags.length) q.tags = c.tags.join(",");
  if (c.sslState) q.sslState = c.sslState;
  if (c.expiringDays != null) q.expiringDays = String(c.expiringDays);
  return q;
};

const fromQuery = (q: Record<string, any>): DomainFilterCriteria => {
  const c = emptyFilterCriteria();
  if (q.search) c.search = String(q.search);
  if (q.status) c.status = String(q.status);
  if (q.watchKind) c.watchKind = String(q.watchKind);
  if (q.priority) c.priority = String(q.priority);
  if (q.group) c.groupName = String(q.group);
  if (q.tags) {
    const raw = String(q.tags);
    c.tags = raw.split(",").map((t) => t.trim()).filter(Boolean);
  }
  if (q.sslState) c.sslState = String(q.sslState);
  if (q.expiringDays) {
    const n = Number(q.expiringDays);
    if (!isNaN(n)) c.expiringDays = n;
  }
  return c;
};

export const useFilterState = () => {
  const route = useRoute();
  const router = useRouter();

  const criteria = useState<DomainFilterCriteria>("domain-filter", () =>
    fromQuery(route.query),
  );

  // Re-sync if route.query changes externally (browser back/forward, deep link)
  watch(
    () => route.query,
    (q) => {
      const next = fromQuery(q);
      // Only overwrite if different to avoid feedback loops
      if (JSON.stringify(next) !== JSON.stringify(criteria.value)) {
        criteria.value = next;
      }
    },
  );

  // Push updates to the URL when criteria changes locally
  let isApplying = false;
  watch(
    criteria,
    (c) => {
      if (isApplying) return;
      const q = toQuery(c);
      const currentQ = route.query;
      // Only navigate if the resulting query differs
      const same =
        JSON.stringify(q) === JSON.stringify(filterRouteQuery(currentQ));
      if (!same) {
        router.replace({ query: q });
      }
    },
    { deep: true },
  );

  const apply = (c: DomainFilterCriteria) => {
    isApplying = true;
    criteria.value = { ...c };
    // schedule URL push next tick so the watcher can run
    nextTick(() => {
      isApplying = false;
      router.replace({ query: toQuery(c) });
    });
  };

  const reset = () => apply(emptyFilterCriteria());

  const removeTag = (tag: string) => {
    criteria.value.tags = criteria.value.tags.filter((t) => t !== tag);
  };

  const activeChips = computed(() => {
    const c = criteria.value;
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (c.search)
      chips.push({
        key: "search",
        label: `🔎 ${c.search}`,
        clear: () => (criteria.value.search = ""),
      });
    // Status is already represented by the prominent quick tabs on /domains.
    // Mirroring it as a chip made the toolbar height change on every tab toggle.
    if (c.watchKind)
      chips.push({
        key: "watchKind",
        label: c.watchKind,
        clear: () => (criteria.value.watchKind = ""),
      });
    if (c.priority)
      chips.push({
        key: "priority",
        label: c.priority,
        clear: () => (criteria.value.priority = ""),
      });
    if (c.groupName)
      chips.push({
        key: "group",
        label: c.groupName,
        clear: () => (criteria.value.groupName = ""),
      });
    if (c.sslState)
      chips.push({
        key: "ssl",
        label: `SSL: ${c.sslState}`,
        clear: () => (criteria.value.sslState = ""),
      });
    if (c.expiringDays != null)
      chips.push({
        key: "expiringDays",
        label: `≤ ${c.expiringDays}d`,
        clear: () => (criteria.value.expiringDays = null),
      });
    for (const tag of c.tags) {
      chips.push({
        key: `tag:${tag}`,
        label: `#${tag}`,
        clear: () => removeTag(tag),
      });
    }
    return chips;
  });

  const isAnyActive = computed(() => !isEmpty(criteria.value));

  // Returns the criteria as URL-style query for $fetch
  const asApiQuery = computed(() => toQuery(criteria.value));

  return {
    criteria,
    activeChips,
    isAnyActive,
    asApiQuery,
    apply,
    reset,
    removeTag,
  };
};

// Strip routing-only keys before comparing query equality
const filterRouteQuery = (q: Record<string, any>) => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v == null || v === "") continue;
    out[k] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return out;
};
