import { useEffect, useState } from "react";
import { App, Button, Modal, Spin } from "antd";
import { Check, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { type EmbedKeyOption, embedBridge, rememberedKeyId, rememberKeyIds } from "@/lib/apophiscode-embed";
import { useConfigStore } from "@/stores/use-config-store";

/** Applies keys from the host's list as the only channels. */
export async function applyEmbedKeys(ids: number[]) {
    const bridge = embedBridge();
    if (!bridge) throw new Error("host bridge unavailable");
    const channels = await Promise.all(ids.map((id) => bridge.channel(id)));
    useConfigStore.getState().applyEmbedChannels(channels);
    rememberKeyIds(ids);
}

export function applyEmbedKey(id: number) {
    return applyEmbedKeys([id]);
}

const CAPABILITIES = [
    ["image", "embed.image"],
    ["video", "embed.video"],
    ["text", "embed.text"],
] as const;

function countOf(option: EmbedKeyOption, capability: string) {
    return option.models.filter((model) => model.capability === capability).length;
}

/** Replaces the config dialog in the embed: the endpoint is fixed, only the key is chosen. */
export function EmbedKeyModal() {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const open = useConfigStore((state) => state.isConfigOpen);
    const setOpen = useConfigStore((state) => state.setConfigDialogOpen);
    const [options, setOptions] = useState<EmbedKeyOption[] | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setOptions(null);
        setSelected(rememberedKeyId());
        const bridge = embedBridge();
        if (!bridge) {
            setOptions([]);
            return;
        }
        bridge.list().then(setOptions, () => setOptions([]));
    }, [open]);

    const confirm = async () => {
        if (selected == null) return;
        setSaving(true);
        try {
            await applyEmbedKey(selected);
            setOpen(false);
        } catch (error) {
            message.error(error instanceof Error ? error.message : String(error));
        } finally {
            setSaving(false);
        }
    };

    const [creating, setCreating] = useState(false);
    const quickSetup = embedBridge()?.quickSetup;

    const runQuickSetup = async () => {
        if (!quickSetup) return;
        setCreating(true);
        try {
            const { ids, channels } = await quickSetup();
            useConfigStore.getState().applyEmbedChannels(channels);
            rememberKeyIds(ids);
            message.success(t("embed.quickDone"));
            setOpen(false);
        } catch (error) {
            const text = error instanceof Error ? error.message : String(error);
            // The host reports a declined usage notice with this exact message.
            if (text !== "Key creation cancelled") message.error(text);
        } finally {
            setCreating(false);
        }
    };

    const usable = (options ?? []).filter((option) => option.models.length > 0);
    // Offer the quick setup until both drawing and chat are covered.
    const covered = ["image", "text"].every((capability) => usable.some((option) => countOf(option, capability) > 0));
    const quickButton = quickSetup ? (
        <Button type="primary" loading={creating} onClick={() => void runQuickSetup()}>
            {t("embed.quickSetup")}
        </Button>
    ) : null;
    return (
        <Modal
            title={t("embed.title")}
            open={open}
            centered
            width={520}
            onCancel={() => setOpen(false)}
            onOk={() => void confirm()}
            okText={t("embed.use")}
            okButtonProps={{ disabled: selected == null || !usable.some((option) => option.id === selected), loading: saving }}
            cancelText={t("common.cancel")}
        >
            <p className="mb-4 text-xs leading-5 text-stone-500">{t("embed.description")}</p>
            {options !== null && usable.length > 0 && !covered && quickButton ? (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-stone-100 px-4 py-3 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                    <span className="min-w-0 flex-1">{t("embed.quickHint")}</span>
                    {quickButton}
                </div>
            ) : null}
            {options === null ? (
                <div className="flex justify-center py-10">
                    <Spin />
                </div>
            ) : usable.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                        <KeyRound className="size-5 text-stone-500" />
                    </span>
                    <p className="max-w-xs text-sm text-stone-600 dark:text-stone-300">{t("embed.noKey")}</p>
                    {quickButton}
                    {quickButton ? <p className="max-w-xs text-xs text-stone-500">{t("embed.quickHint")}</p> : null}
                    <a className="text-sm font-medium underline underline-offset-4" href="/keys" target="_top">
                        {t("embed.manageKeys")}
                    </a>
                </div>
            ) : (
                <div role="radiogroup" aria-label={t("embed.title")} className="-mx-1 flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-1 py-1">
                    {usable.map((option) => {
                        const active = option.id === selected;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setSelected(option.id)}
                                onDoubleClick={() => void confirm()}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 dark:focus-visible:outline-stone-100",
                                    active
                                        ? "border-stone-900 bg-stone-50 shadow-sm dark:border-stone-100 dark:bg-stone-800/60"
                                        : "border-stone-200 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-stone-500 dark:hover:bg-stone-800/40",
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-100">{option.name}</span>
                                    <span className="mt-0.5 block truncate text-xs text-stone-500">{t("embed.group", { group: option.group })}</span>
                                </span>
                                <span className="flex shrink-0 gap-1.5">
                                    {CAPABILITIES.map(([capability, label]) => {
                                        const count = countOf(option, capability);
                                        return (
                                            <span key={capability} className={cn("rounded-md px-2 py-0.5 text-[11px] tabular-nums", count > 0 ? "bg-stone-900/5 text-stone-700 dark:bg-white/10 dark:text-stone-200" : "text-stone-400 dark:text-stone-500")}>
                                                {t(label)} {count}
                                            </span>
                                        );
                                    })}
                                </span>
                                <span
                                    className={cn(
                                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
                                        active ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900" : "border-stone-300 dark:border-stone-600",
                                    )}
                                    aria-hidden
                                >
                                    {active ? <Check className="size-3" strokeWidth={3} /> : null}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
