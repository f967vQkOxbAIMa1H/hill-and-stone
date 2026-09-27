// Service-area ZIP lookup, shared by the ZIP checker and the quote request API. Client-safe, no I/O.
import { serviceAreas, type ServiceArea } from "@/lib/site";

export type ZipResult =
  | { status: "invalid" }
  | { status: "served"; area: ServiceArea }
  | { status: "nearby" } // a Northwest Arkansas ZIP (727xx) that isn't on our list: worth a call
  | { status: "outside" };

export const normalizeZip = (input: string) => input.trim().replace(/-\d{4}$/, "");

/** Which service area a ZIP code is in. Accepts ZIP+4 ("72701-1234"). */
export function lookupZip(input: string, areas: ServiceArea[] = serviceAreas): ZipResult {
  const zip = normalizeZip(input);
  if (!/^\d{5}$/.test(zip)) return { status: "invalid" };
  const area = areas.find((a) => a.zips.includes(zip));
  if (area) return { status: "served", area };
  return zip.startsWith("727") ? { status: "nearby" } : { status: "outside" };
}

/** The service-area slug for a ZIP, or null when it's outside the listed areas. */
export const serviceAreaSlug = (zip: string) => {
  const r = lookupZip(zip);
  return r.status === "served" ? r.area.slug : null;
};
