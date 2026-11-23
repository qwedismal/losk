import { revalidatePath } from "next/cache";
import { fail, json, requireOwner } from "@/lib/api";
import { DEMO_MODE, demoCounts, installDemoData } from "@/lib/demo";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/demo/reset - rebuilds the demo dataset.
 *
 * Owner-only (the one-click demo login gets you there), and hard-gated by
 * DEMO_MODE so a production install can never wipe real requests by accident.
 */
export async function POST(req: Request) {
  if (!DEMO_MODE) return fail(404, "Не найдено");

  const auth = await requireOwner(req);
  if (!auth.ok) return auth.res;

  try {
    await installDemoData({ reset: true });
  } catch {
    return fail(500, "Не удалось сбросить демо-данные");
  }

  logAudit({ actor: auth.ctx.session.user.email, action: "demo.reset" });
  revalidatePath("/");
  revalidatePath("/admin");

  return json({ ok: true, ...demoCounts() });
}
