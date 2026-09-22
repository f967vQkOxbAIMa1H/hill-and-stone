export function AdminHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-navy-200 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div className="min-w-0">
        <h1 className="font-semiwide text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-navy-600">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
