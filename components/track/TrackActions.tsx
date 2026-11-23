"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { postJson } from "@/lib/client";
import { subscribeToPush } from "@/components/PwaProvider";

export function QuoteActions({ token, price }: { token: string; price: number }) {
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: "accept" | "decline") => {
    setBusy(action);
    setError(null);
    const res = await postJson(`/api/track/${token}`, { action, comment: comment || undefined });
    setBusy(null);
    if (!res.ok) {
      setError(res.data?.error || "Не удалось отправить ответ");
      return;
    }
    setDone(action);
    setTimeout(() => window.location.reload(), 900);
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-accent-mist px-4 py-3 text-[13px] font-medium text-accent-deep">
        <Icon name="checkCircle" size={17} />
        {done === "accept"
          ? "Смета согласована. Свяжемся для подтверждения времени."
          : "Ответ отправлен, уточним детали."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => void send("accept")}
          loading={busy === "accept"}
          icon="check"
          className="flex-1"
          aria-label={`Согласовать ${price.toLocaleString("ru-RU")} рублей`}
        >
          Согласовать
        </Button>
        <Button variant="soft" onClick={() => setOpen((v) => !v)} icon="info" className="flex-1">
          Есть вопросы
        </Button>
      </div>

      {open && (
        <div className="animate-pop space-y-2 rounded-2xl border border-line bg-canvas p-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft">
              Что уточнить или с чем не согласны
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Например: нужна только одна сторона матраса"
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-[14px] outline-none focus:border-accent"
            />
          </label>
          <Button variant="soft" size="sm" onClick={() => void send("decline")} loading={busy === "decline"}>
            Отправить уточнение
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[#fbeceb] px-3 py-2 text-[12.5px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function PushToggle({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "on" | "denied">("idle");

  if (state === "on") {
    return (
      <p className="flex items-center gap-2 text-[12.5px] text-accent-deep">
        <Icon name="bell" size={15} /> Уведомления включены
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setState("busy");
        const res = await subscribeToPush(token);
        setState(res.ok ? "on" : "denied");
      }}
      disabled={state === "busy"}
      className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
    >
      <Icon name={state === "denied" ? "bellOff" : "bell"} size={15} className="text-accent-deep" />
      {state === "denied" ? "Уведомления отключены в браузере" : "Включить уведомления о статусе"}
    </button>
  );
}
