import type { Metadata } from "next";
import { fmtDateTime } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { requireCan } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Site settings" };

export default async function SiteSettingsPage() {
  await requireCan("manageSettings");
  const [settings, row] = await Promise.all([getSettings(), db.siteSettings.findUnique({ where: { id: "site" } })]);
  const by = row?.updatedById ? await db.user.findUnique({ where: { id: row.updatedById }, select: { name: true, email: true } }) : null;
  return (
    <>
      <AdminHeader
        title="Site settings"
        description={
          row
            ? `Last saved ${fmtDateTime(row.updatedAt)}${by ? ` by ${by.name ?? by.email}` : ""}. Changes show on the site as soon as you save.`
            : "Showing the built-in defaults. Changes show on the site as soon as you save."
        }
      />
      <div className="px-5 py-6 sm:px-8">
        <SiteSettingsForm settings={settings} />
      </div>
    </>
  );
}
