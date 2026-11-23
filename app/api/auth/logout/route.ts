import { cookies } from "next/headers";
import { AUTH_SIG_COOKIE, destroySession, SESSION_COOKIE } from "@/lib/auth";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  jar.delete(SESSION_COOKIE);
  jar.delete(AUTH_SIG_COOKIE);
  return json({ ok: true });
}
