// Copyright (C) 2026 MilkFoam
// @ts-expect-error bun:test types are not installed; run with `bun test`.
import { expect, test } from "bun:test";

// image.ts pulls in i18n, which reads localStorage at import time.
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: () => null, setItem: () => {} };
const { fitImageSize } = await import("./image");

test("fitImageSize scales small and huge custom sizes into the allowed range", () => {
    expect(fitImageSize(1024, 1024)).toEqual({ width: 1024, height: 1024 });
    expect(fitImageSize(512, 512)).toEqual({ width: 816, height: 816 });
    expect(fitImageSize(1024, 576)).toEqual({ width: 1088, height: 608 });
    expect(fitImageSize(4096, 4096)).toEqual({ width: 2880, height: 2880 });
    expect(fitImageSize(6000, 2000)).toEqual({ width: 3840, height: 1280 });
    for (const [w, h] of [
        [512, 512],
        [1024, 576],
        [4096, 4096],
        [6000, 2000],
        [300, 900],
    ]) {
        const fit = fitImageSize(w, h);
        expect(fit.width * fit.height).toBeGreaterThanOrEqual(655360);
        expect(fit.width * fit.height).toBeLessThanOrEqual(8294400);
        expect(Math.max(fit.width, fit.height)).toBeLessThanOrEqual(3840);
    }
});
