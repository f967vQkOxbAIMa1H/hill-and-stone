// Who can do what in the admin. Client-safe, so the UI can hide what a role can't use.
// Every server action and page still checks on the server.

export const staffRoles = ["OWNER", "ADMIN", "STAFF", "TECHNICIAN"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const roleInfo: Record<StaffRole, { label: string; description: string }> = {
  OWNER: { label: "Owner", description: "Everything, including the team, site settings and revenue." },
  ADMIN: { label: "Office manager", description: "Requests, quotes, payments, portfolio and reviews. Can void quotes. No team or site settings." },
  STAFF: { label: "Staff", description: "Requests, building and sending quotes, portfolio and reviews. Can't void quotes or see revenue." },
  TECHNICIAN: { label: "Technician", description: "Sees requests and quotes, updates request status and adds notes. Can't send or change quotes." },
};

export type Capability =
  | "manageTeam" // add, edit, deactivate accounts
  | "manageSettings" // business settings
  | "viewFinancials" // revenue metrics
  | "manageQuotes" // create, edit, send, resend quotes; request balances
  | "voidQuotes"
  | "manageContent" // portfolio projects and reviews
  | "workRequests"; // view requests and quotes, change request status, add notes

const matrix: Record<Capability, readonly StaffRole[]> = {
  manageTeam: ["OWNER"],
  manageSettings: ["OWNER"],
  viewFinancials: ["OWNER", "ADMIN"],
  manageQuotes: ["OWNER", "ADMIN", "STAFF"],
  voidQuotes: ["OWNER", "ADMIN"],
  manageContent: ["OWNER", "ADMIN", "STAFF"],
  workRequests: ["OWNER", "ADMIN", "STAFF", "TECHNICIAN"],
};

export const isStaffRole = (role: string): role is StaffRole => (staffRoles as readonly string[]).includes(role);
export const can = (role: string, capability: Capability) => isStaffRole(role) && matrix[capability].includes(role);
export const capabilitiesOf = (role: string) => (Object.keys(matrix) as Capability[]).filter((c) => can(role, c));
