"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { maskPhoneInput, postJson } from "@/lib/client";

export function FindForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await postJson<{ trackUrl: string }>("/api/track/find", { code, phone });
    setBusy(false);
    if (!res.ok || !res.data?.trackUrl) {
      setError(res.data?.error || "Заявка не найдена");
      return;
    }
    router.push(res.data.trackUrl);
  };

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-ink-soft">Код заявки</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 20))}
          placeholder="LK-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-[14px] border border-line bg-canvas px-3.5 font-mono text-[16px] tracking-wide outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-ink-soft">Телефон из заявки</span>
        <input
          value={phone}
          onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
          placeholder="+7 (999) 123-45-67"
          inputMode="tel"
          autoComplete="tel"
          className="h-12 w-full rounded-[14px] border border-line bg-canvas px-3.5 text-[16px] outline-none focus:border-accent"
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-xl bg-[#fbeceb] px-3 py-2 text-[12.5px] font-medium text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={busy} icon="eye">
        Найти заявку
      </Button>
    </form>
  );
}
