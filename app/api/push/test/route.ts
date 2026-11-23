import { json, requireOwner } from "@/lib/api";
import { notifyOwner, subscriptionCounts } from "@/lib/push";

export const dynamic = "force-dynamic";

/** POST /api/push/test - sends a test notification to the owner's devices. */
export async function POST(req: Request) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.res;

  const result = await notifyOwner({
    title: "Уведомления работают",
    body: "Так вы узнаете о новой заявке и оплате.",
    url: "/admin",
    tag: "test",
    kind: "message",
  });

  return json({ ok: true, ...result, ...(await subscriptionCounts()) });
}
