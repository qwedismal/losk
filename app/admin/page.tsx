import type { Metadata } from "next";
import Link from "next/link";
import { requireOwnerPage } from "@/lib/admin-auth";
import { listRequests, requestStats } from "@/lib/requests";
import { subscriptionCounts } from "@/lib/push";
import { DEMO_MODE, ensureDemoSeed } from "@/lib/demo";
import { formatMoney, getItem } from "@/lib/pricing";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/ui";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DemoBar } from "@/components/admin/DemoBar";
import type { RequestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заявки",
  robots: { index: false, follow: false, nocache: true },
};

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "quote_sent", label: "Смета" },
  { key: "active", label: "В работе" },
  { key: "payment", label: "Оплата" },
  { key: "closed", label: "Закрытые" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const IN_PROGRESS: RequestStatus[] = ["contacted", "quote_sent", "confirmed", "done", "awaiting_payment"];

function matches(status: RequestStatus, filter: FilterKey): boolean {
  switch (filter) {
    case "new":
      return status === "new";
    case "quote_sent":
      return status === "quote_sent";
    case "active":
      return IN_PROGRESS.includes(status);
    case "payment":
      return status === "awaiting_payment" || status === "paid";
    case "closed":
      return status === "closed" || status === "cancelled";
    default:
      return true;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days === 1) return "вчера";
  return `${days} дн назад`;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireOwnerPage("/admin");
  await ensureDemoSeed();

  const { status } = await searchParams;
  const filter = (FILTERS.some((f) => f.key === status) ? status : "all") as FilterKey;

  const all = await listRequests();
  const stats = await requestStats();
  const subs = await subscriptionCounts();
  const visible = all.filter((r) => matches(r.status, filter));

  const newCount = stats.newCount;
  const activeCount = stats.activeCount;
  const awaiting = stats.awaitingPayment;
  const revenue = stats.paidRevenue;

  return (
    <>
      <AdminHeader ownerSubs={subs.owner} />
      <main id="main" className="bg-canvas-soft pb-16">
        <div className="page pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.03em]">Заявки</h1>
              <p className="text-[12px] text-mute">
                {session.user.email} · {all.length} всего
              </p>
            </div>
            <Link
              href="/"
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 text-[12px] font-medium text-ink-soft"
            >
              <Icon name="arrowUpRight" size={14} />
              Открыть сайт
            </Link>
          </div>

          {/* stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="Новые"
              value={String(newCount)}
              icon="bell"
              tone={newCount > 0 ? "accent" : "plain"}
            />
            <StatCard label="В работе" value={String(activeCount)} icon="spray" />
            <StatCard
              label="Ждут оплаты"
              value={String(awaiting)}
              icon="card"
              tone={awaiting > 0 ? "warn" : "plain"}
            />
            <StatCard label="Оплачено" value={formatMoney(revenue)} icon="ruble" tone="ok" />
          </div>

          {DEMO_MODE ? (
            <div className="mt-3">
              <DemoBar requests={stats.total} />
            </div>
          ) : null}

          {subs.owner === 0 && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-line bg-canvas p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-mist text-accent-deep">
                <Icon name="bellOff" size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Push-уведомления выключены</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">
                  Включите в шапке: и заявка придёт на телефон даже при закрытом сайте.
                </p>
              </div>
            </div>
          )}

          {/* filters */}
          <div className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {FILTERS.map((f) => {
              const active = f.key === filter;
              const count = all.filter((r) => matches(r.status, f.key)).length;
              return (
                <Link
                  key={f.key}
                  href={f.key === "all" ? "/admin" : `/admin?status=${f.key}`}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active ? "bg-ink text-white" : "border border-line bg-canvas text-ink-soft hover:text-ink"
                  }`}
                >
                  {f.label}
                  <span className={`tnum text-[11px] ${active ? "text-white/60" : "text-mute"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* list */}
          <div className="mt-3 space-y-2">
            {visible.length === 0 && (
              <div className="rounded-[22px] border border-dashed border-line bg-canvas px-5 py-10 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-canvas-soft text-mute">
                  <Icon name="list" size={22} />
                </span>
                <p className="mt-3 text-[14px] font-medium">Здесь пока пусто</p>
                <p className="mx-auto mt-1 max-w-[34ch] text-[12px] leading-snug text-ink-soft">
                  Заявки появятся автоматически, когда клиент заполнит калькулятор на сайте.
                </p>
                <Link
                  href="/#calculator"
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-white"
                >
                  Проверить форму
                </Link>
              </div>
            )}

            {visible.map((r) => {
              const item = getItem(r.quiz.item);
              const price = r.quote.price ?? r.estimate.from;
              return (
                <Link
                  key={r.id}
                  href={`/admin/request/${r.id}`}
                  className="flex items-center gap-3 rounded-[18px] border border-line bg-canvas p-3 transition-shadow hover:shadow-soft sm:p-3.5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas-soft text-ink-soft">
                    <Icon name="sofa" size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-[14px] font-semibold">{r.client.name}</p>
                      <span className="shrink-0 font-mono text-[10.5px] text-mute">{r.code}</span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                      <span className="truncate">
                        {item.label} · {timeAgo(r.createdAt)}
                      </span>
                      {r.photos.client.length > 0 && (
                        <span
                          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-mist px-1.5 py-0.5 text-[10px] font-medium text-accent-deep"
                          title="Клиент приложил фото"
                        >
                          <Icon name="photo" size={10} />
                          фото
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tnum text-[13.5px] font-semibold">{formatMoney(price)}</span>
                    <StatusPill status={r.status} compact />
                  </div>
                  <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
                </Link>
              );
            })}
          </div>

          <p className="mt-5 text-center text-[11px] leading-snug text-mute">
            Данные хранятся на сервере приложения. Каждое действие пишется в журнал аудита.
          </p>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "plain",
}: {
  label: string;
  value: string;
  icon: "bell" | "spray" | "card" | "ruble";
  tone?: "plain" | "accent" | "warn" | "ok";
}) {
  const tones = {
    plain: "bg-canvas text-ink",
    accent: "bg-accent-mist text-accent-deep",
    warn: "bg-sand text-warn",
    ok: "bg-[#e7f5ee] text-ok",
  } as const;
  return (
    <div className={`rounded-2xl border border-line p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium opacity-70">{label}</span>
        <Icon name={icon} size={14} className="opacity-60" />
      </div>
      <p className="tnum mt-1 truncate text-[17px] font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}
