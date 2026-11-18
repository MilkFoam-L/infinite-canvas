// ApophisCode embed (MilkFoam-L/infinite-canvas, branch apophiscode).
// The host page www.apophiscode.com/canvas exposes a same-origin key bridge on
// window.parent: the base URL is always the host site and the user picks one
// of their own keys.
import type { ModelCapability } from "@/stores/use-config-store";

export const APOPHISCODE_EMBED = import.meta.env.VITE_APOPHISCODE_EMBED === "true";

export type EmbedModel = { name: string; capability: ModelCapability };

export type EmbedChannel = {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    models: EmbedModel[];
};

/** A key the user can pick; models are what its group and limits allow. */
export type EmbedKeyOption = { id: number; name: string; group: string; models: EmbedModel[] };

type EmbedBridge = {
    list: () => Promise<EmbedKeyOption[]>;
    channel: (id: number) => Promise<EmbedChannel>;
    /** Creates (or reuses) one key per kind of model; older hosts lack it. */
    quickSetup?: () => Promise<{ ids: number[]; channels: EmbedChannel[] }>;
};

export function embedBridge(): EmbedBridge | null {
    try {
        return (window.parent as Window & { apophiscodeCanvasBridge?: EmbedBridge }).apophiscodeCanvasBridge ?? null;
    } catch {
        return null;
    }
}

const KEY_STORAGE = "apophiscode:canvas-key-id";

/** Keys in use; several after a quick setup, since each kind of model has its own group. */
export function rememberedKeyIds(): number[] {
    try {
        return (localStorage.getItem(KEY_STORAGE) ?? "")
            .split(",")
            .map(Number)
            .filter((id) => Number.isFinite(id) && id > 0);
    } catch {
        return [];
    }
}

export function rememberedKeyId(): number | null {
    return rememberedKeyIds()[0] ?? null;
}

export function rememberKeyIds(ids: number[]) {
    try {
        localStorage.setItem(KEY_STORAGE, ids.join(","));
    } catch {
        // Storage unavailable: the picker opens again next time.
    }
}

export function rememberKeyId(id: number) {
    rememberKeyIds([id]);
}

/** The remembered key when it is still listed, else the first key that can draw, else any key with models. */
export function defaultKeyOption(options: EmbedKeyOption[], remembered: number | null): EmbedKeyOption | undefined {
    const usable = options.filter((option) => option.models.length > 0);
    return usable.find((option) => option.id === remembered) ?? usable.find((option) => option.models.some((model) => model.capability === "image")) ?? usable[0];
}
