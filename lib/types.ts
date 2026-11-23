/**
 * Domain types shared between server and client.
 * Nothing secret is stored here - secrets live server-side only.
 */

export type RequestStatus =
  | "new"
  | "contacted"
  | "quote_sent"
  | "confirmed"
  | "done"
  | "awaiting_payment"
  | "paid"
  | "closed"
  | "cancelled";

export type ItemKey = "sofa" | "carpet" | "mattress" | "other";

export type StainLevel = "none" | "light" | "heavy";
export type TimingKey = "asap" | "week" | "flexible";
export type SizeKey = "small" | "medium" | "large" | "xl";

export interface QuizAnswers {
  item: ItemKey;
  size: SizeKey;
  stains: StainLevel;
  timing: TimingKey;
  quantity: number;
}

export interface PriceBreakdownLine {
  label: string;
  amount: number;
}

export interface Estimate {
  from: number;
  to: number;
  currency: "RUB";
  lines: PriceBreakdownLine[];
  durationMin: number;
}

export interface ClientInfo {
  name: string;
  phone: string;
  address?: string;
  district?: string;
  comment?: string;
  preferredDate?: string;
  preferredSlot?: "morning" | "day" | "evening";
}

export interface TimelineEntry {
  at: string;
  type: "created" | "status" | "quote" | "quote_response" | "payment" | "photos" | "note" | "message";
  title: string;
  note?: string;
  clientVisible: boolean;
}

export interface Quote {
  price: number | null;
  note: string;
  sentAt: string | null;
  respondedAt: string | null;
  accepted: boolean | null;
}

export interface PaymentRef {
  id: string;
  status: "pending" | "paid" | "failed" | "refunded";
  amount: number;
  paidAt: string | null;
  method: string | null;
  last4: string | null;
  receipt: string | null;
}

export interface PhotoRef {
  id: string;
  /** before/after are the owner's report shots; client is the optional photo
   *  attached by the customer when submitting the booking form. */
  kind: "before" | "after" | "client";
  mime: string;
  width: number;
  height: number;
  createdAt: string;
  caption?: string;
}

export interface RequestPhotos {
  before: PhotoRef[];
  after: PhotoRef[];
  client: PhotoRef[];
  published: boolean;
}

export interface ServiceRequest {
  id: string;
  /** Public, human-friendly tracking code, e.g. LK-7F3K-92QD */
  code: string;
  /** Secret token for the read-only client tracking link and payment page */
  trackToken: string;
  payToken: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  client: ClientInfo;
  quiz: QuizAnswers;
  estimate: Estimate;
  quote: Quote;
  payment: PaymentRef | null;
  photos: RequestPhotos;
  timeline: TimelineEntry[];
  source: "site";
  /** internal only */
  ipHash: string;
  userAgentHash: string;
}

export interface Session {
  /** sha256 of the raw session token - the raw value never touches disk */
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  ipHash: string;
  uaHash: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner";
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** notification preferences */
  notify: { newRequest: boolean; payment: boolean; quietHours: boolean };
}

export interface PushSub {
  id: string;
  audience: "owner" | "client";
  /** owner:id or request:id */
  audienceRef: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface Upload {
  id: string;
  requestId: string | null;
  kind: "before" | "after" | "client" | "avatar";
  mime: string;
  bytes: number;
  sha256: string;
  width: number;
  height: number;
  createdAt: string;
  /** stored on disk relative to data/uploads */
  file: string;
}

export interface PaymentRecord {
  id: string;
  requestId: string;
  amount: number;
  currency: "RUB";
  status: "pending" | "paid" | "failed" | "refunded";
  provider: string;
  idempotencyKey: string;
  createdAt: string;
  paidAt: string | null;
  last4: string | null;
  receipt: string | null;
  webhookVerified: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target?: string;
  meta?: Record<string, string | number | boolean>;
  ipHash?: string;
}

export interface Store {
  version: number;
  users: User[];
  sessions: Session[];
  requests: ServiceRequest[];
  pushSubs: PushSub[];
  uploads: Upload[];
  payments: PaymentRecord[];
  audit: AuditEntry[];
}

/** Public projection of a request - safe to send to the browser. */
export interface PublicRequest {
  code: string;
  createdAt: string;
  status: RequestStatus;
  quiz: QuizAnswers;
  estimate: Estimate;
  client: { name: string; phoneMasked: string; address?: string };
  quote: { price: number | null; note: string; sentAt: string | null; accepted: boolean | null };
  payment: { status: string; amount: number; paidAt: string | null; receipt: string | null } | null;
  photos: RequestPhotos;
  timeline: TimelineEntry[];
  payUrl: string | null;
}
