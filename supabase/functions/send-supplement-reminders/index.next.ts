// ============================================================================
// NOT DEPLOYED. WRITTEN, NOT APPLIED (wellbeing build plan WP16; security-data H2 to H4).
//
// The generalised reminder function. It replaces index.ts (keeping the function's name, so the
// cron job is unchanged: build plan C15) only once, in this order:
//   1. docs/migrations/2026-10-09-notify-sent.sql is applied (notify_sent, notify_claim), and
//   2. Benn has said yes (his answer to C15: asked before anything touches the live database),
//   3. then: copy this file over index.ts and deploy with verify_jwt off, as today.
// Until then index.ts (main's lock-screen fix, deployed 2026-10-09) stays the live version, and
// this file is never bundled (nothing imports it).
//
// What changes against index.ts:
// - Subscriptions are grouped by person; consent and settings are read once per person, the
//   settings in one batch.
// - Times follow the person's own clock: profile.mind.tz (IANA, from the phone), else UK time.
//   The weekly review reminder stays on UK time, as the privacy policy says (maintenance loop).
// - The Mind reminders (check-in, wind-down, plan check-in): only types the person turned on
//   (`profile.mind.notify[kind] === true`), never in quiet hours (after the wind-down time, before
//   the usual wake time). At most one check-in or plan reminder a day: the day is claimed in
//   notify_sent (notify_claim, atomic) before anything is sent, so two runs or two subscriptions
//   can never send two. The wind-down reminder sits outside that cap (Benn, 10 Oct 2026) but is
//   claimed the same way for its own day (by_kind), so it too goes at most once a day. A halved
//   type goes only every other day (by_kind). Supplement reminders don't claim anything.
// - Every payload is fixed copy from ../_shared/reminders.ts: no supplement name, no mood or sleep
//   word, nothing from the log. Logs and the response carry counts only.
//
// Health consent (docs/migrations/2026-09-28-health-consent-server.sql): someone whose latest
// health answer isn't a yes gets no reminders, and their profile isn't read.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";
import { dueKinds, isCapped, localNow, payloadFor, suppPayload, suppsDue, type MindKind } from "../_shared/reminders.ts";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  (webpush as any).setVapidDetails("mailto:benn@gravita.co", VAPID_PUBLIC, VAPID_PRIVATE);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Constant-time comparison so the secret can't be probed by timing.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const shiftDay = (d: string, n: number) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const reviewDayOn = (d: string, weekday: number) => shiftDay(d, -((new Date(d + "T12:00:00Z").getUTCDay() - weekday + 7) % 7));

/** Review days since the reminder went on (or was kept) that passed without the review being opened. */
function unopened(p: any, today: string): number {
  const from = [p.reviewPushFrom, p.lastReviewAt].filter((x: unknown) => typeof x === "string").sort().pop();
  if (!from) return 0;
  let n = 0;
  for (let d = reviewDayOn(shiftDay(today, -1), p.reviewDay ?? 0); d > from; d = shiftDay(d, -7)) if (d !== p.reviewPushSkip) n++;
  return n;
}

/** Same rule as the app (src/core/domain/maintenanceLoop.ts reminderDue): unchanged from index.ts. */
function reviewDue(p: any, today: string, dow: number, time: string): boolean {
  if (!p?.reviewPush) return false;
  if ((p.reviewDay ?? 0) !== dow || (p.reviewPushTime ?? "09:00") !== time) return false;
  if (p.lastReviewAt && p.lastReviewAt >= today) return false;
  if (p.reviewPushSkip === today) return false;
  return unopened(p, today) < 3;
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth_key: string };

Deno.serve(async (req: Request) => {
  // Fail closed. The secret comes from the CRON_SECRET env var if set,
  // otherwise from Vault via verify_cron_secret (service role only).
  const provided = req.headers.get("x-cron-secret") ?? "";
  let authorised = false;
  if (CRON_SECRET) {
    authorised = safeEqual(provided, CRON_SECRET);
  } else if (provided) {
    const { data, error } = await supabase.rpc("verify_cron_secret", { p_secret: provided });
    if (error) console.error(`secret check failed: ${error.code}`);
    authorised = data === true;
  }
  if (!authorised) {
    console.warn(`unauthorised request (checked against ${CRON_SECRET ? "env" : "vault"})`);
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const london = localNow("Europe/London", now);

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key");

  if (error) console.error(`subscriptions query failed: ${error.code}`);
  if (error || !subscriptions?.length) {
    return json({ time: london.time, sent: 0, failed: 0 });
  }

  // Counts only: supplement names can reveal medication, and which reminders someone gets says
  // something about them, so neither appears in the response or the logs.
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let capped = 0;

  const byUser = new Map<string, Sub[]>();
  for (const s of subscriptions as Sub[]) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  // no current yes to health data: no reminder, and the profile isn't read
  const consenting: string[] = [];
  for (const uid of byUser.keys()) {
    const { data: ok, error: cErr } = await supabase.rpc("health_consent_current", { uid });
    if (cErr) console.error(`consent check failed: ${cErr.code}`);
    if (ok === true) consenting.push(uid); else skipped += byUser.get(uid)!.length;
  }
  if (!consenting.length) return json({ time: london.time, sent, failed, skipped });

  const profiles = new Map<string, any>();
  const sentRows = new Map<string, { last_on: string | null; by_kind: Record<string, unknown> | null }>();
  for (let i = 0; i < consenting.length; i += 200) {
    const ids = consenting.slice(i, i + 200);
    const { data: rows, error: sErr } = await supabase.from("settings").select("user_id, profile").in("user_id", ids);
    if (sErr) console.error(`settings query failed: ${sErr.code}`);
    for (const r of rows ?? []) profiles.set(r.user_id, r.profile);
    const { data: ns, error: nErr } = await supabase.from("notify_sent").select("user_id, last_on, by_kind").in("user_id", ids);
    if (nErr) console.error(`notify_sent query failed: ${nErr.code}`);
    for (const r of ns ?? []) sentRows.set(r.user_id, r);
  }

  const send = async (sub: Sub, payload: unknown): Promise<"ok" | "gone" | "failed"> => {
    try {
      await (webpush as any).sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
      );
      sent++;
      return "ok";
    } catch (err: any) {
      failed++;
      console.error(`push failed: status ${err?.statusCode ?? "unknown"}`);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        return "gone";
      }
      return "failed";
    }
  };

  for (const uid of consenting) {
    const profile = profiles.get(uid);
    if (!profile) continue;
    let subs = byUser.get(uid)!;
    const local = localNow(profile?.mind?.tz, now);

    // the weekly review reminder: unchanged, UK time
    if (reviewDue(profile, london.day, london.dow, london.time)) {
      const left: Sub[] = [];
      for (const sub of subs) if ((await send(sub, { title: "Your week is ready", body: "Take a look whenever suits you.", tag: "tali-review", url: "./?review=1", icon: "/icon-192.png" })) !== "gone") left.push(sub);
      subs = left;
    }

    // supplement reminders: the person's own times, outside the daily cap; generic text only
    if (profile?.notificationsEnabled && suppsDue(profile?.supplements, local.time) > 0) {
      const left: Sub[] = [];
      for (const sub of subs) if ((await send(sub, suppPayload())) !== "gone") left.push(sub);
      subs = left;
    }

    // the Mind reminders: opt-in, quiet hours, halving. One check-in or plan reminder a day (the
    // first due, claimed before sending); the wind-down reminder outside that cap, once a day
    // (its own claim). Each is claimed before it's sent.
    const row = sentRows.get(uid);
    const due = dueKinds({ mind: profile?.mind, plans: profile?.plans, day: local.day, time: local.time, lastOn: row?.last_on ?? null, byKind: row?.by_kind ?? null });
    const toSend = [due.find(isCapped), due.find((k) => !isCapped(k))].filter((k): k is MindKind => !!k);
    for (const kind of toSend) {
      if (!subs.length) break;
      const { data: claimed, error: clErr } = await supabase.rpc("notify_claim", { uid, day: local.day, kind });
      if (clErr) { console.error(`claim failed: ${clErr.code}`); continue; }
      if (claimed !== true) { capped++; continue; }
      const left: Sub[] = [];
      for (const sub of subs) if ((await send(sub, payloadFor(kind))) !== "gone") left.push(sub);
      subs = left;
    }
  }

  return json({ time: london.time, sent, failed, skipped, capped });
});
