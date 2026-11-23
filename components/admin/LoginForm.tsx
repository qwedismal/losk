"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { postJson } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/login", { email, password });
    setBusy(false);
    if (!res.ok) {
      setError(res.data?.error || "Не удалось войти");
      return;
    }
    // Only allow internal redirects - never trust the query string as a URL.
    const safe = next.startsWith("/admin") ? next : "/admin";
    router.replace(safe);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-[380px]">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-[16px] bg-ink text-white">
          <Icon name="lock" size={22} />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.03em]">Кабинет владельца</h1>
        <p className="mt-1.5 text-[13px] text-ink-soft">Заявки, сметы и оплаты в одном месте</p>
      </div>

      <div className="mt-6 space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-soft">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            inputMode="email"
            placeholder="owner@losk.ru"
            className="h-12 w-full rounded-[14px] border border-line bg-canvas px-3.5 text-[16px] outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-soft">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
            placeholder="Минимум 8 символов"
            className="h-12 w-full rounded-[14px] border border-line bg-canvas px-3.5 text-[16px] outline-none focus:border-accent"
          />
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-[#fbeceb] px-3 py-2 text-[12.5px] font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={busy} icon="lock" className="mt-4">
        Войти
      </Button>

      <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-mute">
        <Icon name="shield" size={13} className="mt-px shrink-0" />
        Вход ограничен по попыткам. Сессия хранится в HttpOnly-cookie и живёт 7 дней.
      </p>
    </form>
  );
}
