import { z } from "zod";
import { revalidatePath } from "next/cache";
import { fail, json, readBody, requireOwner, guard } from "@/lib/api";
import { addNote, findById, setPhotosPublished, setQuote, updateStatus } from "@/lib/requests";
import { statusUpdateSchema, quoteSchema, stripControl } from "@/lib/validate";
import { notifyClient } from "@/lib/push";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/** One PATCH endpoint for every owner-side transition, so auth + CSRF + audit
 *  live in exactly one place instead of being copy-pasted per action.
 *
 *  Note: options MUST be plain ZodObjects with the discriminator in their shape.
 *  `.and()` produces a ZodIntersection, which discriminatedUnion cannot read
 *  (it throws while building the schema), so the merging happens up front. */
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }).merge(statusUpdateSchema),
  z.object({ action: z.literal("quote") }).merge(quoteSchema),
  z.object({ action: z.literal("publish"), published: z.boolean() }),
  z.object({ action: z.literal("note"), text: z.string().min(1).max(600) }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    return await handlePatch(req, ctx);
  } catch {
    // Never let an unexpected failure render an HTML error page from an API
    // route: clients expect JSON and stack traces must not leak.
    return fail(500, "Внутренняя ошибка. Повторите позже.");
  }
}

async function handlePatch(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.res;

  const limited = guard(req, "upload", "admin-mutate");
  if (limited) return limited;

  const { id } = await ctx.params;
  const existing = await findById(id);
  if (!existing) return fail(404, "Заявка не найдена");

  const body = await readBody(req, actionSchema);
  if (!body.ok) return body.res;
  const payload = body.data;
  const actor = auth.ctx.session.user.email;

  if (payload.action === "status") {
    const updated = await updateStatus(id, payload.status, { note: payload.note, actor });
    if (!updated) return fail(404, "Заявка не найдена");
    if (payload.notifyClient) {
      await notifyClient(updated.id, {
        title: "Статус заявки изменился",
        body: `${updated.code}: ${payload.status === "confirmed" ? "мастер назначен" : "обновление по заявке"}`,
        url: `/t/${updated.trackToken}`,
        tag: `request-${updated.code}`,
        kind: "status",
      }).catch(() => {});
    }
    return json({ ok: true, status: updated.status });
  }

  if (payload.action === "quote") {
    const updated = await setQuote(id, payload.price, payload.note ?? "", actor);
    if (!updated) return fail(404, "Заявка не найдена");
    if (payload.notifyClient) {
      await notifyClient(updated.id, {
        title: "Смета готова",
        body: `${updated.code}: ${formatMoney(payload.price)}. Проверьте и подтвердите.`,
        url: `/t/${updated.trackToken}`,
        tag: `quote-${updated.code}`,
        kind: "quote",
      }).catch(() => {});
    }
    return json({ ok: true, price: payload.price });
  }

  if (payload.action === "publish") {
    const updated = await setPhotosPublished(id, payload.published, actor);
    if (!updated) return fail(404, "Заявка не найдена");
    // The public gallery on "/" is ISR-cached; invalidate it so a freshly
    // published photo appears immediately instead of after the next window.
    revalidatePath("/");
    return json({ ok: true, published: updated.photos.published });
  }

  const text = stripControl(payload.text);
  const updated = await addNote(id, text, actor);
  if (!updated) return fail(404, "Заявка не найдена");
  return json({ ok: true });
}
