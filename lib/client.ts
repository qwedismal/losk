"use client";

/** Browser-side helpers: CSRF header, JSON POST, clipboard. */

export function csrfHeader(): Record<string, string> {
  const match = document.cookie.match(/(?:^|;\s*)losk_csrf=([^;]+)/);
  return match ? { "x-csrf-token": decodeURIComponent(match[1]) } : {};
}

export interface PostResult<T> {
  ok: boolean;
  status: number;
  data: (T & { error?: string; fields?: Record<string, string> }) | null;
}

export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  opts: { headers?: Record<string, string> } = {},
): Promise<PostResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-losk-client": "1",
        ...csrfHeader(),
        ...opts.headers,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function patchJson<T = unknown>(
  url: string,
  body: unknown,
  opts: { headers?: Record<string, string> } = {},
): Promise<PostResult<T>> {
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-losk-client": "1",
        ...csrfHeader(),
        ...opts.headers,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function deleteJson<T = unknown>(url: string): Promise<PostResult<T>> {
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "x-losk-client": "1", ...csrfHeader() },
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Formats +7XXXXXXXXXX into +7 (999) 123-45-67 while typing. */
export function maskPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  const d = digits.startsWith("7") ? digits : `7${digits}`;
  const parts = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = "+7";
  if (parts[0]) out += ` (${parts[0]}`;
  if (parts[0].length === 3) out += ")";
  if (parts[1]) out += ` ${parts[1]}`;
  if (parts[2]) out += `-${parts[2]}`;
  if (parts[3]) out += `-${parts[3]}`;
  return out;
}
