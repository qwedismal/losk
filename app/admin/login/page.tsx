import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/admin-auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { DemoLoginButton } from "@/components/admin/DemoLoginButton";
import { ensureOwnerAccount } from "@/lib/auth";
import { DEMO_MODE, ensureDemoSeed } from "@/lib/demo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход в кабинет",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await getOwnerSession();
  if (session) redirect("/admin");
  await ensureOwnerAccount();
  await ensureDemoSeed();

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-canvas-soft px-5 py-10">
      <div className="w-full max-w-[380px] rounded-[26px] border border-line bg-canvas p-5 shadow-soft sm:p-7">
        <Suspense fallback={<div className="h-[320px] animate-pulse rounded-xl bg-canvas-soft" />}>
          <LoginForm />
        </Suspense>
        {DEMO_MODE ? <DemoLoginButton /> : null}
      </div>
    </main>
  );
}
