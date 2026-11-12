import { afterAll, expect, test } from "bun:test";

// Config and i18n use browser storage during module initialization.
const values = new Map<string, string>();
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    },
});
afterAll(() => {
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
});

const { defaultKeyOption } = await import("../src/lib/apophiscode-embed");
const { applyEmbedChannels, defaultConfig } = await import("../src/stores/use-config-store");

const channel = {
    id: "key-2",
    name: "生图",
    baseUrl: "https://www.apophiscode.com",
    apiKey: "sk-a",
    models: [
        { name: "gpt-image-2.5", capability: "image" as const },
        { name: "seedance-2", capability: "video" as const },
        { name: "gpt-6-sol", capability: "text" as const },
    ],
};

test("the host channel replaces the stock channel and defaults follow capability", () => {
    const config = applyEmbedChannels(defaultConfig, [channel]);
    expect(config.channels.map((c) => c.id)).toEqual(["key-2"]);
    expect(config.imageModel).toBe("key-2::gpt-image-2.5");
    expect(config.videoModel).toBe("key-2::seedance-2");
    expect(config.textModel).toBe("key-2::gpt-6-sol");
    expect(config.audioModel).toBe("");
    // Switching to a key without video clears the video default instead of keeping a dead model.
    const imageOnly = applyEmbedChannels(config, [{ ...channel, id: "key-3", models: channel.models.slice(0, 1) }]);
    expect(imageOnly.imageModel).toBe("key-3::gpt-image-2.5");
    expect(imageOnly.videoModel).toBe("");
});

test("default key: remembered first, then one that can draw, never an empty key", () => {
    const options = [
        { id: 1, name: "chat", group: "codex", models: [{ name: "gpt-6-sol", capability: "text" as const }] },
        { id: 2, name: "draw", group: "image", models: [{ name: "gpt-image-2.5", capability: "image" as const }] },
        { id: 3, name: "empty", group: "x", models: [] },
    ];
    expect(defaultKeyOption(options, 1)?.id).toBe(1);
    expect(defaultKeyOption(options, 3)?.id).toBe(2);
    expect(defaultKeyOption(options, null)?.id).toBe(2);
    expect(defaultKeyOption([options[2]], null)).toBeUndefined();
});
