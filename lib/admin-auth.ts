import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession, SESSION_COOKIE, type SessionContext } from "./auth";
import { sessionCsrfToken } from "./csrf";

/**
 * Server-side authorisation for the owner area.
 * Used by every /admin page and by the API guards - a single implementation,
 * so there is no path where "the page forgot to check".
 */
export async function getOwnerSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  const session = await resolveSession(jar.get(SESSION_COOKIE)?.value);
  if (!session || session.user.role !== "owner") return null;
  return session;
}

export async function requireOwnerPage(next = "/admin"): Promise<SessionContext> {
  const session = await getOwnerSession();
  if (!session) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  return session;
}

export function csrfForSession(session: SessionContext): string {
  return sessionCsrfToken(session.sessionId);
}
