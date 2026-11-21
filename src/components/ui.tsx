'use client';
import React, { useEffect } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm" style={{ color: 'var(--ink-2)' }}>
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label ?? 'Loading'}
    </div>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="pp-panel flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="text-base font-semibold">{title}</div>
      {detail && <div className="text-sm" style={{ color: 'var(--ink-2)' }}>{detail}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: 'rgba(4,6,10,.7)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`pp-panel mt-6 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="pp-btn pp-btn-ghost !px-2 !py-1">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="pp-label">{label}</label>
      {children}
    </div>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    HIGH: { bg: 'rgba(248,113,113,.15)', fg: '#f87171', label: 'High' },
    MEDIUM: { bg: 'rgba(251,191,36,.15)', fg: '#fbbf24', label: 'Medium' },
    LOW: { bg: 'rgba(154,163,178,.15)', fg: '#9aa3b2', label: 'Low' },
  };
  const s = styles[priority] ?? styles.MEDIUM;
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const ini = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <span
      title={name}
      className="inline-flex items-center justify-center rounded-full font-semibold"
      style={{
        width: size, height: size, fontSize: size * 0.42,
        background: 'var(--teal-dim)', color: 'var(--teal)',
      }}
    >
      {ini}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="pp-error" role="alert">{message}</div>;
}
