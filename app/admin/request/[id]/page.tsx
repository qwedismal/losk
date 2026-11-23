import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { csrfForSession, requireOwnerPage } from "@/lib/admin-auth";
import { findById } from "@/lib/requests";
import { RequestDetail } from "@/components/admin/RequestDetail";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { subscriptionCounts } from "@/lib/push";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заявка",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerPage("/admin");
  const { id } = await params;

  if (!/^req_[a-f0-9]{32}$/.test(id)) notFound();

  const request = await findById(id);
  if (!request) notFound();

  const subs = await subscriptionCounts();

  return (
    <>
      <AdminHeader ownerSubs={subs.owner} />
      <main id="main" className="bg-canvas-soft">
        <RequestDetail request={request} csrf={csrfForSession(session)} />
      </main>
    </>
  );
}
