import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";
import { can, isStaffRole, type Capability } from "./permissions";

export const SESSION_COOKIE = "hs_admin";
const SESSION_DAYS = 14;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const h = await headers();
  await db.session.create({
    data: { tokenHash: hash(token), userId, expiresAt, ipAddress: clientIp(h), userAgent: h.get("user-agent")?.slice(0, 300) },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

/** The signed-in admin for this request, or null. Cached per request. */
export const getAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, deactivatedAt: true, mustChangePassword: true } } },
  });
  // Deactivated accounts and non-staff roles are treated as signed out.
  if (!session || session.expiresAt < new Date() || !isStaffRole(session.user.role) || session.user.deactivatedAt) {
    return null;
  }
  // Refresh activity at most every 10 minutes.
  if (Date.now() - session.lastSeenAt.getTime() > 10 * 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => null);
  }
  return session.user;
});

/**
 * Use at the top of every admin page and server action. Someone signed in with a temporary
 * password is sent to choose their own before they can do anything else.
 */
export async function requireAdmin(opts: { allowPasswordChange?: boolean } = {}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword && !opts.allowPasswordChange) redirect("/admin/password");
  return admin;
}

/** requireAdmin plus a permission check. Pages and actions a role can't use send it to the overview. */
export async function requireCan(capability: Capability) {
  const admin = await requireAdmin();
  if (!can(admin.role, capability)) redirect("/admin?denied=1");
  return admin;
}

/** Signs a user out everywhere, except (optionally) the session making this request. */
export async function revokeSessions(userId: string, opts: { keepCurrent?: boolean } = {}) {
  const token = opts.keepCurrent ? (await cookies()).get(SESSION_COOKIE)?.value : undefined;
  await db.session.deleteMany({ where: { userId, ...(token ? { tokenHash: { not: hash(token) } } : {}) } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(SESSION_COOKIE);
}
