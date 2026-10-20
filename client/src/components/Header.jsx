import { Moon, Sun } from 'lucide-react';

export default function Header({ dark, setDark }) {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">SalesPilot Voice Agent</h1>
        <p className="muted text-sm">An AI sales executive that talks, listens, remembers and follows up.</p>
      </div>
      <button className="btn border border-ink/15 dark:border-white/15" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
