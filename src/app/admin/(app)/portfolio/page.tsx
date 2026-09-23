import { requireCan } from "@/lib/auth/session";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { fmtDay } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { categoryOptions, labelFor } from "@/lib/quote-request/options";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  await requireCan("manageContent");
  const projects = await db.project.findMany({
    orderBy: [{ published: "desc" }, { featured: "desc" }, { updatedAt: "desc" }],
    include: { images: { select: { isBefore: true, pairKey: true } } },
  });

  return (
    <>
      <AdminHeader
        title="Portfolio"
        description="Projects shown on Our Work. Featured projects with before and after photos lead the home page."
        actions={
          <ButtonLink prefetch={false} href="/admin/portfolio/new">
            <Plus aria-hidden />
            New project
          </ButtonLink>
        }
      />
      <div className="px-5 py-6 sm:px-8">
        {projects.length === 0 ? (
          <div className="rounded-panel border border-dashed border-navy-300 p-8 text-center">
            <p className="font-semibold">No projects yet.</p>
            <p className="mt-1 text-sm text-navy-600">Add a finished job with before and after photos. It&apos;s the most convincing thing on the site.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-panel border border-navy-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-navy-200 bg-stone-50 text-navy-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Project</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Photos</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {projects.map((p) => {
                  const pair = p.images.some((i) => i.isBefore && i.pairKey === "main") && p.images.some((i) => !i.isBefore && i.pairKey === "main");
                  return (
                    <tr key={p.id} className="group relative hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <Link prefetch={false} href={`/admin/portfolio/${p.id}`} className="font-semibold after:absolute after:inset-0 group-hover:text-copper-700">
                          {p.title}
                        </Link>
                        <span className="block text-navy-600">
                          {labelFor(categoryOptions, p.category)}, {p.city}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy-700">
                        {p.images.length === 0 ? "None yet" : `${p.images.length} photo${p.images.length === 1 ? "" : "s"}`}
                        <span className="block text-navy-600">{pair ? "Before and after set" : "No before/after pair"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1">
                          <Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Published" : "Draft"}</Badge>
                          {p.featured && <Badge tone="copper">Featured</Badge>}
                          {p.slug.startsWith("sample-") && <Badge tone="danger">Sample</Badge>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-navy-600">{fmtDay(p.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
