import { useDb } from "../utils/db";

// Most API handlers expect a shared `db` instance. `useDb()` is lazily
// initialized and cached, so this remains a singleton across imports.
export const db = useDb();
