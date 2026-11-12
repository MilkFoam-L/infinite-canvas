// ApophisCode embed (MilkFoam-L/infinite-canvas, branch apophiscode).
// The host page at www.apophiscode.com/canvas passes the user's own keys and
// models in the URL fragment, so they never reach a server log.
import type { ModelCapability } from "@/stores/use-config-store";

export const APOPHISCODE_EMBED = import.meta.env.VITE_APOPHISCODE_EMBED === "true";

// Captured at module load: the "/" -> "/canvas" redirect drops the fragment
// before React effects run.
export const INITIAL_HASH = typeof window === "undefined" ? "" : window.location.hash;

export type EmbedChannel = {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    models: { name: string; capability: ModelCapability }[];
};

const CAPABILITIES: readonly string[] = ["image", "video", "text", "audio"];

/** Reads `#embed=<base64url JSON>`; returns null when absent or malformed. */
export function readEmbedChannels(hash: string): EmbedChannel[] | null {
    const raw = new URLSearchParams(hash.replace(/^#/, "")).get("embed");
    if (!raw) return null;
    try {
        const json = new TextDecoder().decode(Uint8Array.from(atob(raw.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) return null;
        return parsed
            .filter((c): c is EmbedChannel => typeof c?.id === "string" && typeof c?.baseUrl === "string" && typeof c?.apiKey === "string" && Array.isArray(c?.models))
            .map((c) => ({
                id: c.id,
                name: typeof c.name === "string" ? c.name : c.id,
                baseUrl: c.baseUrl,
                apiKey: c.apiKey,
                models: c.models.filter((m) => typeof m?.name === "string" && CAPABILITIES.includes(m?.capability)),
            }));
    } catch {
        return null;
    }
}
