import { z } from "zod";
import { fail, guard, json, readBody } from "@/lib/api";
import { findByTrackToken, respondToQuote } from "@/lib/requests";
import { notifyOwner } from "@/lib/push";
import { formatMoney } from "@/lib/pricing";
import { stripControl } from "@/lib/validate";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["accept", "decline"]),
  comment: z.string().max(300).optional(),
});

/**
 * POST /api/track/[token] - the client accepts or declines the quoted price.
 *
 * The secret track token is the only credential, so this endpoint is rate
 * limited per IP and every state change is written to the audit log alongside
 * the request timeline.
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const limited = guard(req, "track", "quote-response");
  if (limited) return limited;

  const { token } = await ctx.params;
  const request = await findByTrackToken(token);
  if (!request) return fail(404, "Заявка не найдена");

  const body = await readBody(req, schema);
  if (!body.ok) return body.res;

  if (!request.quote.sentAt || !request.quote.price) {
    return fail(409, "Смета ещё не отправлена");
  }
  if (request.quote.accepted !== null) {
    return fail(409, "Ответ по смете уже получен");
  }

  const comment = body.data.comment ? stripControl(body.data.comment) : "";
  const accepted = body.data.action === "accept";

  const updated = await respondToQuote(request.id, accepted, comment || undefined);
  if (!updated) return fail(409, "Смета уже обработана");

  await notifyOwner({
    title: accepted ? "Смета согласована" : "Клиент не согласился со сметой",
    body: `${request.code} · ${formatMoney(request.quote.price)}${comment ? ` · «${comment.slice(0, 60)}»` : ""}`,
    url: `/admin/request/${request.id}`,
    tag: `quote-${request.code}`,
    kind: "quote",
  }).catch(() => {});

  return json({ ok: true, accepted });
}
