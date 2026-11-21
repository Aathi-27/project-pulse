export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight">
            Project <span style={{ color: 'var(--teal)' }}>Pulse</span>
          </div>
          <div className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            Organize projects, assign tasks, collaborate in real time.
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
