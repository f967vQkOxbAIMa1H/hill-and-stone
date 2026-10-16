"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { changePasswordSchema, newStaffSchema, passwordRule, staffSchema, type ChangePasswordInput, type NewStaffInput, type StaffInput } from "@/lib/admin/team-schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { roleInfo } from "@/lib/auth/permissions";
import { requireAdmin, requireCan, revokeSessions } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/auth/temp-password";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { layout, esc } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getSite, saveSettings } from "@/lib/settings";
import { settingsSchema, type SettingsInput } from "@/lib/settings/schema";

type Result = { ok: true; id?: string; message: string; tempPassword?: string } | { ok: false; errors: Record<string, string> };

const flatten = (e: z.ZodError) => {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join(".") || "form"] ??= i.message;
  return out;
};
const digits = (p: string) => p.replace(/\D/g, "") || null;

/** The last active owner can't be demoted or deactivated, or nobody could manage the team. */
async function isLastActiveOwner(userId: string) {
  const owners = await db.user.findMany({ where: { role: "OWNER", deactivatedAt: null, passwordHash: { not: null } }, select: { id: true } });
  return owners.length === 1 && owners[0].id === userId;
}

// ─── Team ───────────────────────────────────────────────────────────────────

export async function createStaffUser(input: NewStaffInput): Promise<Result> {
  const owner = await requireCan("manageTeam");
  const parsed = newStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const v = parsed.data;

  const existing = await db.user.findUnique({ where: { email: v.email } });
  if (existing && existing.role !== "CUSTOMER") return { ok: false, errors: { email: "Someone on the team already uses this email." } };
  if (existing) return { ok: false, errors: { email: "This email belongs to a customer portal account. Use a different email." } };

  const user = await db.user.create({
    data: {
      name: v.name,
      email: v.email,
      phone: digits(v.phone),
      role: v.role,
      passwordHash: await hashPassword(v.tempPassword),
      mustChangePassword: true,
    },
  });

  let emailNote = "";
  if (v.sendNotice) {
    const site = await getSite();
    const loginUrl = `${env.NEXT_PUBLIC_APP_URL}/admin/login`;
    const result = await sendEmail({
      type: "STAFF_ACCOUNT_NOTICE",
      to: user.email,
      replyTo: owner.email,
      subject: `Your ${site.name} admin login is ready`,
      // Never includes the password: the owner shares that separately.
      html: layout(
        site,
        `<p style="margin:0 0 12px;font-size:20px;font-weight:800">Hi ${esc(v.name.split(" ")[0])}, your login is ready.</p>
<p style="margin:0 0 12px">${esc(owner.name ?? owner.email)} added you to the ${esc(site.name)} admin as <strong>${esc(roleInfo[v.role].label)}</strong>.</p>
<p style="margin:0 0 12px">Sign in with this email address and the temporary password they give you. You'll choose your own password the first time you sign in.</p>
<p style="margin:20px 0"><a href="${esc(loginUrl)}" style="display:inline-block;background:#0f172a;color:#f8fafc;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:4px">Go to sign in</a></p>`,
      ),
      text: `Hi ${v.name.split(" ")[0]}, ${owner.name ?? owner.email} added you to the ${site.name} admin as ${roleInfo[v.role].label}.\n\nSign in at ${loginUrl} with this email and the temporary password they give you. You'll choose your own password the first time you sign in.`,
    });
    emailNote = result.ok ? ` We emailed ${user.email} that their login is ready.` : " The notice email didn't send; let them know yourself.";
  }

  revalidatePath("/admin/team");
  return { ok: true, id: user.id, tempPassword: v.tempPassword, message: `Account created.${emailNote}` };
}

export async function updateStaffUser(input: StaffInput): Promise<Result> {
  const owner = await requireCan("manageTeam");
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { ok: false, errors: parsed.success ? { form: "Missing account." } : flatten(parsed.error) };
  const v = parsed.data;
  const user = await db.user.findUnique({ where: { id: v.id } });
  if (!user || user.role === "CUSTOMER") return { ok: false, errors: { form: "That account no longer exists." } };

  if (v.role !== user.role) {
    if (user.id === owner.id) return { ok: false, errors: { role: "You can't change your own role. Ask another owner." } };
    if (user.role === "OWNER" && (await isLastActiveOwner(user.id))) return { ok: false, errors: { role: "This is the only active owner. Make someone else an owner first." } };
  }
  if (v.email !== user.email && (await db.user.findUnique({ where: { email: v.email } }))) {
    return { ok: false, errors: { email: "Another account already uses this email." } };
  }

  await db.user.update({ where: { id: user.id }, data: { name: v.name, email: v.email, phone: digits(v.phone), role: v.role } });
  // A role change takes effect on their next request; no need to sign them out.
  revalidatePath("/admin/team");
  return { ok: true, id: user.id, message: "Saved." };
}

/** Sets a new temporary password (generated if blank) and signs the person out everywhere. */
export async function resetStaffPassword(userId: string, tempPassword: string): Promise<Result> {
  const owner = await requireCan("manageTeam");
  if (userId === owner.id) return { ok: false, errors: { form: "Change your own password from My account." } };
  const password = tempPassword.trim() || generateTempPassword();
  const check = passwordRule.safeParse(password);
  if (!check.success) return { ok: false, errors: { tempPassword: check.error.issues[0].message } };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "CUSTOMER") return { ok: false, errors: { form: "That account no longer exists." } };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), mustChangePassword: true } });
  await revokeSessions(userId);
  revalidatePath(`/admin/team/${userId}`);
  return { ok: true, id: userId, tempPassword: password, message: `Password reset. ${user.name ?? user.email} has been signed out and will choose a new password at next sign-in.` };
}

export async function setStaffActive(userId: string, active: boolean): Promise<Result> {
  const owner = await requireCan("manageTeam");
  if (userId === owner.id) return { ok: false, errors: { form: "You can't deactivate your own account." } };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "CUSTOMER") return { ok: false, errors: { form: "That account no longer exists." } };
  if (!active && user.role === "OWNER" && (await isLastActiveOwner(userId))) {
    return { ok: false, errors: { form: "This is the only active owner. Make someone else an owner first." } };
  }
  await db.user.update({ where: { id: userId }, data: { deactivatedAt: active ? null : new Date() } });
  if (!active) await revokeSessions(userId);
  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
  return { ok: true, id: userId, message: active ? "Access restored. They can sign in again." : "Access revoked. They've been signed out everywhere." };
}

// ─── My account ─────────────────────────────────────────────────────────────

export async function changeOwnPassword(input: ChangePasswordInput): Promise<Result> {
  const me = await requireAdmin({ allowPasswordChange: true });
  if (!(await rateLimit(`pw:${me.id}`, 10, 15 * 60_000))) return { ok: false, errors: { form: "Too many attempts. Wait 15 minutes and try again." } };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return { ok: false, errors: { current: "That isn't your current password." } };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false } });
  await revokeSessions(me.id, { keepCurrent: true });
  if (user.mustChangePassword) redirect("/admin?welcome=1");
  return { ok: true, message: "Password changed. You've been signed out on other devices." };
}

// ─── Site settings ──────────────────────────────────────────────────────────

export async function updateSiteSettings(input: SettingsInput): Promise<Result> {
  const owner = await requireCan("manageSettings");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  await saveSettings(parsed.data, owner.id);
  return { ok: true, message: "Saved. The site shows the new details now." };
}
