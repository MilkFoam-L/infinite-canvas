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

const { readEmbedChannels } = await import("../src/lib/apophiscode-embed");
const { applyEmbedChannels, defaultConfig } = await import("../src/stores/use-config-store");

const channels = [
    { id: "image", name: "生图", baseUrl: "https://www.apophiscode.com", apiKey: "sk-a", models: [{ name: "gpt-image-2.5", capability: "image" }, { name: "gpt-6-sol", capability: "text" }] },
    { id: "video", name: "视频", baseUrl: "https://www.apophiscode.com", apiKey: "sk-b", models: [{ name: "seedance-2", capability: "video" }, { name: "bad", capability: "nope" }] },
];
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

test("reads channels from the fragment and drops unknown capabilities", () => {
    const read = readEmbedChannels(`#embed=${encode(channels)}`);
    expect(read?.map((c) => c.models.map((m) => m.name))).toEqual([["gpt-image-2.5", "gpt-6-sol"], ["seedance-2"]]);
    expect(readEmbedChannels("#embed=%%%")).toBeNull();
    expect(readEmbedChannels("")).toBeNull();
});

test("embed channels replace the stock channel and pick defaults per capability", () => {
    const config = applyEmbedChannels(defaultConfig, readEmbedChannels(`#embed=${encode(channels)}`)!);
    expect(config.channels.map((c) => c.id)).toEqual(["image", "video"]);
    expect(config.imageModel).toBe("image::gpt-image-2.5");
    expect(config.textModel).toBe("image::gpt-6-sol");
    expect(config.videoModel).toBe("video::seedance-2");
    expect(config.audioModel).toBe("");
    // A still-valid earlier choice is kept on the next open.
    const again = applyEmbedChannels({ ...config, textModel: "image::gpt-6-sol" }, config.channels);
    expect(again.textModel).toBe("image::gpt-6-sol");
});
