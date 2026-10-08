// Supplement reminders and the weekly review reminder (Web Push), called by a cron job with the
// cron secret. The review reminder (boards ml-d1, ml-d2; maintenance-loop.md) mirrors
// `reminderDue` in src/core/domain/maintenanceLoop.ts: keep the two in step.
// Copy of the deployed function, kept in the repo (docs/compliance/README.md). Deploy with
// verify_jwt off: it authenticates with the cron secret, not a user's JWT.
//
// Health consent (docs/migrations/2026-09-28-health-consent-server.sql): someone whose latest
// health answer isn't a yes gets no reminders, since reminders use their supplements (health
// data) from the synced profile.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

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

/** Same rule as the app: switched on, the review day at the chosen time, not opened yet, not a skipped week, fewer than 3 unopened. */
function reviewDue(p: any, today: string, dow: number, time: string): boolean {
  if (!p?.reviewPush) return false;
  if ((p.reviewDay ?? 0) !== dow || (p.reviewPushTime ?? "09:00") !== time) return false;
  if (p.lastReviewAt && p.lastReviewAt >= today) return false;
  if (p.reviewPushSkip === today) return false;
  return unopened(p, today) < 3;
}

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
  // the review day and the review reminder's date, in London time like the supplement times
  const londonDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const londonDow = new Date(londonDate + "T12:00:00Z").getUTCDay();
  const londonTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key");

  if (error) console.error(`subscriptions query failed: ${error.code}`);
  if (error || !subscriptions?.length) {
    return json({ time: londonTime, sent: 0, failed: 0 });
  }

  // Counts only: supplement names can reveal medication, so they never
  // appear in the response or the logs.
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const consent = new Map<string, boolean>();

  for (const sub of subscriptions) {
    // no current yes to health data: no reminder (and the profile isn't read)
    if (!consent.has(sub.user_id)) {
      const { data: ok, error: cErr } = await supabase.rpc("health_consent_current", { uid: sub.user_id });
      if (cErr) console.error(`consent check failed: ${cErr.code}`);
      consent.set(sub.user_id, ok === true);
    }
    if (!consent.get(sub.user_id)) { skipped++; continue; }

    const { data: settings } = await supabase
      .from("settings")
      .select("profile")
      .eq("user_id", sub.user_id)
      .single();

    const profile = settings?.profile as any;

    // the weekly review reminder: generic text only, nothing from the log (a lock screen is visible
    // to anyone nearby); switched on separately from supplement reminders
    if (reviewDue(profile, londonDate, londonDow, londonTime)) {
      try {
        await (webpush as any).sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: "Your week is ready", body: "Take a look whenever suits you.", tag: "tali-review", url: "./?review=1", icon: "/icon-192.png" }),
        );
        sent++;
      } catch (err: any) {
        failed++;
        console.error(`push failed: status ${err?.statusCode ?? "unknown"}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          continue;
        }
      }
    }

    if (!profile?.notificationsEnabled) continue;

    const supplements: Array<{ id: string; name: string; time: string }> =
      profile?.supplements ?? [];

    const dueNow = supplements.filter((s) => s.time === londonTime);

    for (const supp of dueNow) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      };
      try {
        await (webpush as any).sendNotification(
          pushSub,
          JSON.stringify({
            title: "Supplement reminder",
            body: supp.name,
            tag: `supp-${supp.id}`,
            icon: "/icon-192.png",
          })
        );
        sent++;
      } catch (err: any) {
        failed++;
        console.error(`push failed: status ${err?.statusCode ?? "unknown"}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          break;
        }
      }
    }
  }

  return json({ time: londonTime, sent, failed, skipped });
});
