import { useEffect, useState } from "react";
import { App, Modal, Radio, Spin } from "antd";
import { useTranslation } from "react-i18next";

import { type EmbedKeyOption, embedBridge, rememberedKeyId, rememberKeyId } from "@/lib/apophiscode-embed";
import { useConfigStore } from "@/stores/use-config-store";

/** Applies a key picked from the host's list as the only channel. */
export async function applyEmbedKey(id: number) {
    const bridge = embedBridge();
    if (!bridge) throw new Error("host bridge unavailable");
    const channel = await bridge.channel(id);
    useConfigStore.getState().applyEmbedChannels([channel]);
    rememberKeyId(id);
}

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

    const usable = (options ?? []).filter((option) => option.models.length > 0);
    return (
        <Modal
            title={t("embed.title")}
            open={open}
            centered
            onCancel={() => setOpen(false)}
            onOk={() => void confirm()}
            okText={t("embed.use")}
            okButtonProps={{ disabled: selected == null || !usable.some((option) => option.id === selected), loading: saving }}
            cancelText={t("common.cancel")}
        >
            <p className="mb-3 text-xs text-stone-500">{t("embed.description")}</p>
            {options === null ? (
                <div className="flex justify-center py-8">
                    <Spin />
                </div>
            ) : usable.length === 0 ? (
                <div className="py-6 text-center text-sm">
                    <p>{t("embed.noKey")}</p>
                    <a className="mt-2 inline-block underline" href="/keys" target="_top">
                        {t("embed.manageKeys")}
                    </a>
                </div>
            ) : (
                <Radio.Group className="!flex max-h-[50vh] flex-col gap-2 overflow-y-auto" value={selected} onChange={(event) => setSelected(event.target.value)}>
                    {usable.map((option) => (
                        <Radio key={option.id} value={option.id} className="!m-0 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
                            <div className="font-medium">{option.name}</div>
                            <div className="text-xs text-stone-500">{t("embed.keySummary", { group: option.group, image: countOf(option, "image"), video: countOf(option, "video"), text: countOf(option, "text") })}</div>
                        </Radio>
                    ))}
                </Radio.Group>
            )}
        </Modal>
    );
}
