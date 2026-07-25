import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  ArrowRight, Copy, Download, GraduationCap, Menu, Moon, Pause, Play, Printer, Sun, X,
  BookOpen, HelpCircle, Sparkles, Landmark, Vote, PlugZap, ShieldAlert
} from 'lucide-react';
import SEMCanvas, { type Selection } from './components/SEMCanvas';
import { Button } from '@/components/ui/button';
import { BentoGrid } from '@/components/ui/bento-grid';
import { constructs, fit, modifications, paths, pathways, reliability, sample, thesisResources, type PageId } from './data/model';

const Scene3D = lazy(() => import('./components/Scene3D'));

const pages: PageId[] = ['poster', 'background', 'model', 'pathways', 'evidence', 'methods', 'conclusion'];
const labels: Record<PageId, string> = { poster: 'Overview', background: 'Background', model: 'Model', pathways: 'Pathways', evidence: 'Evidence', methods: 'Methods', conclusion: 'Conclusion' };
const citation = 'Magtalas, B. C. (2024). Charting the Path to Net Zero: Investigating the Underlying Constructs Shaping the Energy Transition Landscape. Graduate School of Asia-Pacific Studies, Waseda University.';
const glossary = [
  ['Latent construct', 'An unobserved concept represented by multiple observable indicators.'],
  ['Factor loading', 'The standardized relationship between an indicator and its latent construct.'],
  ['Standardized coefficient', 'The expected standard-deviation change in an outcome associated with a one-standard-deviation change in a predictor, within the specified model.'],
  ['p-value', 'A measure used to assess evidence against a null hypothesis; it does not measure effect importance.'],
  ['γ / β notation', 'Symbols used in the thesis to distinguish structural paths among exogenous and endogenous constructs.'],
  ['Modification index', 'A diagnostic suggesting how much model fit may improve if a constrained parameter is freed.'],
  ['Cross-loading', 'An indicator loading on a construct other than its primary construct.'],
  ['Residual covariance', 'A modeled association between unexplained portions of two indicators.'],
  ['RMSEA · CFI · TLI · χ²/df', 'Fit indices: RMSEA ≤ .08 indicates acceptable approximate fit; CFI and TLI ≥ .90 indicate acceptable incremental fit; χ²/df < 5 is a common parsimony-adjusted criterion.'],
  ['GFI · AGFI · NFI', 'Additional fit indices reflecting explained variance (GFI, AGFI) and improvement over a null model (NFI); ≥ .90 is the conventional threshold.'],
  ['CR — Composite Reliability', 'Internal consistency of a latent construct computed from standardized loadings; ≥ .70 is conventionally acceptable.'],
  ['AVE — Average Variance Extracted', 'The share of indicator variance captured by a construct relative to measurement error; ≥ .50 is conventionally desired.']
] as const;

// Shared entrance: fade-rise with an optional stagger index.
// Strong ease-out (STANDARDS: entrances start fast); full transform strings are
// hardware-accelerated, unlike Framer's x/y shorthands — this matters because
// entrances run while the WebGL hero scene is initializing.
const easeOutStrong = [0.23, 1, 0.32, 1] as const;
const rise = (i = 0) => ({
  initial: { opacity: 0, transform: 'translateY(16px)' },
  animate: { opacity: 1, transform: 'translateY(0px)' },
  transition: { duration: 0.4, delay: i * 0.08, ease: easeOutStrong }
});
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const riseIn = { hidden: { opacity: 0, transform: 'translateY(22px)' }, visible: { opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.5, ease: easeOutStrong } } };

export default function App() {
  const initial = (new URLSearchParams(location.search).get('page') as PageId) || 'poster';
  const [page, setPage] = useState<PageId>(pages.includes(initial) ? initial : 'poster');
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem('sem-theme');
      return stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches);
    } catch { return matchMedia('(prefers-color-scheme: dark)').matches; }
  });
  const [selection, setSelection] = useState<Selection>(null);
  const [pathway, setPathway] = useState<keyof typeof pathways>('command');
  const [autoplay, setAutoplay] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    // Safari private mode throws on setItem — theme still applies, it just won't persist.
    try { localStorage.setItem('sem-theme', dark ? 'dark' : 'light'); } catch { /* non-fatal */ }
  }, [dark]);
  useEffect(() => { const q = new URLSearchParams(location.search); q.set('page', page); history.replaceState(null, '', `${location.pathname}?${q}`); }, [page]);
  useEffect(() => {
    if (!autoplay || page !== 'pathways') return;
    const keys = Object.keys(pathways) as (keyof typeof pathways)[];
    const t = window.setInterval(() => setPathway(p => keys[(keys.indexOf(p) + 1) % keys.length]), 4200);
    return () => clearInterval(t);
  }, [autoplay, page]);

  const notify = (message: string) => { window.clearTimeout(toastTimer.current); setToast(message); toastTimer.current = window.setTimeout(() => setToast(''), 2200); };
  const go = (p: PageId) => { setPage(p); setSelection(null); if (p !== 'pathways') setAutoplay(false); };
  const copyCitation = async () => {
    try { await navigator.clipboard.writeText(citation); notify('Citation copied'); } catch {
      const ta = document.createElement('textarea'); ta.value = citation; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); notify('Citation copied');
    }
  };
  const downloadCSV = () => {
    const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
    const rows = [
      ['Section', 'Hypothesis/ID', 'Symbol/Type', 'From/LHS', 'To/RHS', 'Estimate', 'p-value', 'Interpretation'],
      ...paths.map(p => ['Structural path', p.hypothesis, p.symbol, p.from, p.to, p.coefficient, p.p, p.interpretation]),
      ...modifications.map(m => ['Model modification', m.id.toUpperCase(), m.type, m.lhs, m.rhs, m.estimate, m.p, m.note])
    ];
    const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'net-zero-sem-evidence.csv'; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); notify('CSV downloaded');
  };
  const printAll = () => { document.body.dataset.printAll = 'true'; window.setTimeout(() => { window.print(); delete document.body.dataset.printAll; }, 100); };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell flex h-dvh flex-col bg-background text-foreground">
        <Header page={page} onNavigate={go} dark={dark} onTheme={() => setDark(v => !v)} />
        <main className="min-h-0 flex-1" id="main-content">
          <div className="screen-only h-full min-h-0">
            {page === 'poster' && <Poster onStart={() => go('background')} onExplore={() => go('model')} />}
            {page === 'background' && <Background />}
            {page === 'model' && <ModelPage selection={selection} onSelect={setSelection} />}
            {page === 'pathways' && <PathwaysPage pathway={pathway} setPathway={p => { setPathway(p); setAutoplay(false); }} autoplay={autoplay} setAutoplay={setAutoplay} />}
            {page === 'evidence' && <Evidence />}
            {page === 'methods' && <Methods />}
            {page === 'conclusion' && <Conclusion onPrint={printAll} onCSV={downloadCSV} onCopy={copyCitation} onStart={() => go('poster')} />}
          </div>
          <div className="print-only">
            <Poster onStart={() => {}} onExplore={() => {}} />
            <Background />
            <ModelPage selection={null} onSelect={() => {}} />
            <PathwaysPrint />
            <Evidence />
            <Methods />
            <Conclusion onPrint={() => {}} onCSV={() => {}} onCopy={() => {}} onStart={() => {}} />
          </div>
        </main>
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, transform: 'translateY(16px) scale(0.96)' }}
              animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(8px) scale(0.97)', transition: { duration: 0.15, ease: easeOutStrong } }}
              transition={{ duration: 0.22, ease: easeOutStrong }}
              className="toast fixed bottom-6 right-6 z-50 rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-soft"
              role="status" aria-live="polite"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Header({ page, onNavigate, dark, onTheme }: { page: PageId; onNavigate: (p: PageId) => void; dark: boolean; onTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = (p: PageId) => { onNavigate(p); setOpen(false); };
  return (
    <header className="topbar relative z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-[72px] items-center gap-4 px-4 sm:px-6">
        <button className="flex min-w-0 cursor-pointer items-center gap-3 text-left" onClick={() => navigate('poster')} aria-label="Go to overview">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-waseda text-white shadow-md shadow-waseda/25" aria-hidden="true">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="min-w-0 leading-tight">
            <strong className="block truncate font-serif text-lg font-semibold tracking-tight">Bernie Calderon Magtalas</strong>
            <small className="block truncate text-xs"><span className="font-bold text-waseda">Waseda University</span><span className="hidden text-muted-foreground sm:inline"> · Graduate School of Asia-Pacific Studies</span></small>
          </span>
        </button>
        <nav aria-label="Primary navigation" id="primary-navigation" className="mx-auto hidden items-center gap-1 lg:flex">
          {pages.map(p => (
            <button
              key={p}
              className={`relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${page === p ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              aria-current={page === p ? 'page' : undefined}
              onClick={() => navigate(p)}
            >
              {page === p && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full bg-primary/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">{labels[p]}</span>
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'}>
            {open ? <X /> : <Menu />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} title="Toggle theme">
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>
      <AnimatePresence>
      {open && (
        <motion.nav
          initial={{ opacity: 0, transform: 'translateY(-10px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-8px)', transition: { duration: 0.15, ease: easeOutStrong } }}
          transition={{ duration: 0.2, ease: easeOutStrong }}
          className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-background/95 p-3 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
          {pages.map(p => (
            <button
              key={p}
              className={`cursor-pointer rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${page === p ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              aria-current={page === p ? 'page' : undefined}
              onClick={() => navigate(p)}
            >
              {labels[p]}
            </button>
          ))}
        </motion.nav>
      )}
      </AnimatePresence>
    </header>
  );
}

function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <motion.div {...rise()} className="shrink-0">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{kicker}</span>
      <h1 className="mb-0.5 mt-1 font-serif text-2xl font-semibold leading-[1.05] tracking-tight sm:text-3xl">{title}</h1>
      <p className="m-0 max-w-3xl text-xs text-muted-foreground sm:text-sm">{sub}</p>
    </motion.div>
  );
}

function AnimatedStat({ n, l }: { n: number; l: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setValue(n); return; }
    let raf = 0; const start = performance.now(); const duration = 1050;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(n * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    setValue(0); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
      <strong className="block font-serif text-2xl font-semibold text-primary sm:text-3xl">{value}</strong>
      <span className="text-xs text-muted-foreground">{l}</span>
    </div>
  );
}

function Panel({ className = '', children, ...motionProps }: { className?: string } & React.ComponentProps<typeof motion.div>) {
  return <motion.div className={`rounded-3xl border border-border bg-card shadow-soft ${className}`} {...motionProps}>{children}</motion.div>;
}

function Caution({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border-l-4 border-gold bg-muted px-3.5 py-2 text-xs leading-snug text-muted-foreground">{children}</div>;
}

function CautionDetails({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border-l-4 border-gold bg-muted px-3 py-1.5 text-[0.6875rem] leading-snug text-muted-foreground">
      <summary className="cursor-pointer list-none font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="mr-1 inline-block text-gold transition-transform duration-200 group-open:rotate-90">›</span>{summary}
      </summary>
      <p className="mb-0.5 mt-1">{children}</p>
    </details>
  );
}

/* ---------------- Overview / Poster (hero adapted from 21st.dev hero-section-9) ---------------- */
function Poster({ onStart, onExplore }: { onStart: () => void; onExplore: () => void }) {
  const scenes = [
    { label: 'Energy transition', number: '01', statement: 'Energy systems are changing through shifts in technology, institutions, investment, and policy.', type: 'wind' as const },
    { label: 'Greenhouse gas challenge', number: '02', statement: 'High carbon intensity underscores the need for structural change in energy systems.', type: 'emissions' as const },
    { label: 'International cooperation', number: '03', statement: 'Political commitment to international climate agreements shapes how ambition becomes energy policy.', type: 'network' as const },
    { label: 'Renewable energy adoption', number: '04', statement: 'Renewable energy adoption is associated with institutional, political, and investment conditions.', type: 'solar' as const },
    { label: 'Net zero pathways', number: '05', statement: 'The transition to net zero depends on how enabling conditions relate to energy system outcomes.', type: 'particles' as const }
  ] as const;
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    // Depending on `scene` restarts the countdown whenever a dot is clicked,
    // so a manual selection always gets its full display time.
    // 5 s ≈ caption reading time (12–16 words at ~150 wpm) at a brisker cadence.
    const id = window.setInterval(() => setScene(v => (v + 1) % scenes.length), 5000);
    return () => window.clearInterval(id);
  }, [scenes.length, paused, scene]);
  const current = scenes[scene];
  return (
    <section className="page h-full overflow-y-auto" data-page="poster">
      <div className="mx-auto grid min-h-full max-w-[1500px] grid-cols-1 items-center gap-6 px-5 py-6 sm:px-8 lg:h-full lg:grid-cols-[46%_54%] lg:gap-8 lg:py-4">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col">
          <motion.span variants={riseIn} className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Interactive academic poster
          </motion.span>
          <motion.h1 variants={riseIn} className="m-0 font-serif text-4xl font-semibold leading-[0.95] tracking-tight sm:text-5xl xl:text-6xl">
            Charting the Path<br />
            <span className="text-primary">to Net Zero</span>
          </motion.h1>
          <motion.h2 variants={riseIn} className="mb-0 mt-3 max-w-xl font-serif text-lg font-medium leading-snug text-foreground/85 sm:text-xl">
            Investigating the underlying constructs shaping the energy transition landscape
          </motion.h2>
          <motion.p variants={riseIn} className="mt-2 max-w-xl text-sm leading-snug text-muted-foreground">
            This study examines how institutional, political, investment, and energy system conditions are associated with renewable energy adoption.
          </motion.p>
          <motion.p variants={riseIn} className="mt-2.5 text-xs text-muted-foreground sm:text-sm">
            <strong className="text-foreground">Bernie Calderon Magtalas</strong> · Student ID 4022R349 · Adviser: Prof. Atsushi Kato
          </motion.p>
          <motion.div variants={riseIn} className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <AnimatedStat n={120} l="countries" />
            <AnimatedStat n={27} l="observed variables" />
            <AnimatedStat n={7} l="latent constructs" />
            <AnimatedStat n={9} l="supported relationships" />
          </motion.div>
          <motion.div variants={riseIn} className="mt-4 flex flex-wrap gap-3">
            <Button size="lg" onClick={onStart}>Explore the findings <ArrowRight /></Button>
            <Button size="lg" variant="outline" onClick={onExplore}>Open the model <ArrowRight /></Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, transform: 'scale(0.97)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ duration: 0.5, ease: easeOutStrong }}
          className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-border shadow-soft lg:min-h-0 lg:self-stretch"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-label="Looping 3D narrative about the energy transition"
          aria-live="polite"
        >
          <Suspense fallback={<div className="scene3d-fallback" aria-hidden="true" />}>
            <Scene3D key={scene} type={current.type} active />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div
              key={`${scene}-${current.label}`}
              initial={{ opacity: 0, transform: 'translateY(14px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              exit={{ opacity: 0, transform: 'translateY(-8px)', transition: { duration: 0.14, ease: easeOutStrong } }}
              transition={{ duration: 0.24, ease: easeOutStrong }}
              className="absolute inset-x-6 bottom-16 text-white"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="font-serif text-2xl font-semibold text-white/70">{current.number}</span>
                <b className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-300">{current.label}</b>
              </div>
              <strong className="block max-w-lg font-serif text-xl font-medium leading-snug sm:text-2xl">{current.statement}</strong>
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-x-6 bottom-6 flex gap-2" aria-label={`Scene ${scene + 1} of ${scenes.length}`}>
            {scenes.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className="group flex h-6 flex-1 cursor-pointer items-center focus-visible:outline-none"
                onClick={() => setScene(index)}
                aria-label={`Show scene ${index + 1}: ${item.label}`}
                aria-current={index === scene}
              >
                <i className={`block h-1 w-full rounded-full transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-emerald-300 ${index === scene ? 'bg-emerald-300' : 'bg-white/30 group-hover:bg-white/55'}`} />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Background ---------------- */
function Background() {
  return (
    <section className="page h-full overflow-y-auto" data-page="background">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col justify-center gap-4 px-5 py-5 sm:px-8">
        <PageHead kicker="Research context" title="Why examine the hidden structure of energy transition?" sub="The study tests whether widely used indicators form theoretically meaningful constructs and how those constructs relate to one another." />
        <motion.div {...rise(1)}>
          <BentoGrid items={[
            { title: 'Research gap', meta: '01', description: 'Established energy-transition indices aggregate many indicators, but their underlying constructs and interrelationships are not consistently validated statistically.', icon: <BookOpen className="h-5 w-5" />, status: 'Motivation', hasPersistentHover: true },
            { title: 'Research question', meta: '02', description: 'What latent constructs shape the global energy-transition landscape, and how are these constructs structurally related?', icon: <HelpCircle className="h-5 w-5" />, status: 'Question' },
            { title: 'Contribution', meta: '03', description: 'Provides an empirically tested seven-construct framework and identifies voluntary, regulatory, and market based routes toward renewable energy adoption.', icon: <Sparkles className="h-5 w-5" />, status: 'Outcome' }
          ]} />
        </motion.div>
        <Panel {...rise(2)} className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 font-serif text-xl font-semibold">Research design</h2>
            <small className="text-sm font-bold text-primary">From indicator selection to structural interpretation</small>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
            {[
              ['1', 'Indicator framework', '27 observed variables assembled from international energy and governance datasets'],
              ['2', 'Measurement model', 'Confirmatory factor analysis used to test the seven latent constructs'],
              ['3', 'Structural model', 'SEM used to estimate nine relationships among the validated constructs'],
              ['4', 'Interpretation', 'Direct and indirect associations examined with appropriate methodological cautions']
            ].map(([n, t, d], i) => (
              <Fragment key={t}>
                <div className="rounded-2xl border border-border bg-muted/50 p-3">
                  <b className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</b>
                  <strong className="mt-2 block text-sm font-bold">{t}</strong>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{d}</span>
                </div>
                {i < 3 && <i className="hidden select-none items-center text-lg text-primary md:flex" aria-hidden="true">→</i>}
              </Fragment>
            ))}
          </div>
          <p className="mb-0 mt-3 text-xs text-muted-foreground">The Background page explains the research problem and analytical design. The complete estimated architecture is reserved for the Model page.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {['Formulate the measurement model', 'Validate it through CFA', 'Formulate the structural model', 'Validate it through SEM'].map((x, i) => (
              <div key={x} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-1.5">
                <b className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[0.6875rem] font-bold leading-none text-primary-foreground">{i + 1}</b>
                <span className="text-xs font-bold">{x}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

/* ---------------- Model ---------------- */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground" aria-label="Diagram legend">
      <span className="flex items-center gap-2"><i className="inline-block w-8 border-t-[3px] border-[#6b8578]" />Positive association</span>
      <span className="flex items-center gap-2"><i className="inline-block w-8 border-t-[3px] border-dashed border-negative" />Negative association</span>
      <span className="flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-primary" />Latent construct</span>
      <span className="font-bold text-foreground">β / γ</span>
      <span>Standardized coefficient</span>
    </div>
  );
}

function ModelPage({ selection, onSelect }: { selection: Selection; onSelect: (s: Selection) => void }) {
  return (
    <section className="page h-full overflow-y-auto" data-page="model">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-8 lg:h-full lg:min-h-[560px]">
        <PageHead kicker="Interactive model" title="Complete structural architecture" sub="Hover to trace connections. Select a construct or coefficient to open its evidence panel while keeping the full model visible." />
        <Panel {...rise(1)} className="flex min-h-0 flex-col overflow-hidden lg:flex-1">
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-2.5">
            <Legend />
            <strong className="hidden text-xs font-bold text-primary sm:block">Select a construct or coefficient for details</strong>
          </div>
          <div className="relative flex h-[264px] w-full lg:h-auto lg:min-h-[480px] lg:flex-1">
            {/* Diagram shrinks left; on desktop the inspector docks beside it (split view)
                so the full model stays visible — on mobile it overlays (no room to split). */}
            <div className="relative min-w-0 flex-1">
              <SEMCanvas selected={selection} onSelect={onSelect} />
            </div>
            <AnimatePresence>{selection && <Inspector selection={selection} onClose={() => onSelect(null)} />}</AnimatePresence>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Inspector({ selection, onClose }: { selection: Exclude<Selection, null>; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', handler);
    return () => removeEventListener('keydown', handler);
  }, [onClose]);
  const shell = 'absolute bottom-4 right-4 top-4 z-10 w-[min(360px,80%)] overflow-auto rounded-3xl border border-border bg-card p-5 shadow-soft lg:static lg:ml-3 lg:w-[340px] lg:shrink-0 lg:self-stretch lg:bottom-auto lg:right-auto lg:top-auto';
  const slide = {
    initial: { opacity: 0, transform: 'translateX(28px)' },
    animate: { opacity: 1, transform: 'translateX(0px)' },
    exit: { opacity: 0, transform: 'translateX(28px)', transition: { duration: 0.18, ease: easeOutStrong } },
    transition: { duration: 0.25, ease: easeOutStrong }
  } as const;
  if (selection.type === 'node') {
    const n = constructs.find(x => x.id === selection.id)!;
    return (
      <motion.aside {...slide} className={shell} role="complementary" aria-label={`${n.name} evidence`} aria-live="polite">
        <button ref={close} className="absolute right-3 top-3 cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onClose} aria-label="Close evidence panel"><X className="h-4 w-4" /></button>
        <span className="text-[0.6875rem] font-extrabold uppercase tracking-[0.13em] text-primary">{n.role}</span>
        <h2 className="mb-2 mt-1.5 pr-8 font-serif text-2xl font-semibold">{n.name}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{n.description}</p>
        <div className="mt-3">
          {n.indicators.map(i => (
            <div key={i.code} className="grid grid-cols-[44px_1fr_56px] gap-2 border-b border-border py-2.5 text-xs">
              <strong>{i.code}</strong>
              <span><b className="block">{i.name}</b><small className="mt-0.5 block text-muted-foreground">{i.note}</small></span>
              <em className="text-right font-bold not-italic">{i.loading.toFixed(3)}</em>
            </div>
          ))}
        </div>
      </motion.aside>
    );
  }
  const p = paths.find(x => x.id === selection.id)!;
  return (
    <motion.aside {...slide} className={shell} role="complementary" aria-label={`${p.hypothesis} path evidence`} aria-live="polite">
      <button ref={close} className="absolute right-3 top-3 cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onClose} aria-label="Close evidence panel"><X className="h-4 w-4" /></button>
      <span className="text-[0.6875rem] font-extrabold uppercase tracking-[0.13em] text-primary">{p.hypothesis} · {p.symbol}</span>
      <h2 className="mb-2 mt-1.5 pr-8 font-serif text-2xl font-semibold">{p.from} → {p.to}</h2>
      <div className={`font-serif text-5xl font-semibold ${p.coefficient < 0 ? 'text-negative' : 'text-primary'}`}>{p.coefficient.toFixed(3)}</div>
      <dl className="my-3">
        <div className="my-2.5"><dt className="text-[0.6875rem] font-extrabold uppercase tracking-wider">p-value</dt><dd className="m-0 mt-0.5 text-sm text-muted-foreground">{p.p}</dd></div>
        <div className="my-2.5"><dt className="text-[0.6875rem] font-extrabold uppercase tracking-wider">Interpretation</dt><dd className="m-0 mt-0.5 text-sm leading-relaxed text-muted-foreground">{p.interpretation}</dd></div>
      </dl>
      <Caution>Modeled relationship; correlational, not causal.</Caution>
    </motion.aside>
  );
}

/* ---------------- Pathways ---------------- */
function PathwaysPage({ pathway, setPathway, autoplay, setAutoplay }: { pathway: keyof typeof pathways; setPathway: (p: keyof typeof pathways) => void; autoplay: boolean; setAutoplay: (v: boolean) => void }) {
  const p = pathways[pathway];
  return (
    <section className="page h-full overflow-y-auto" data-page="pathways">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 sm:px-8 lg:h-full lg:min-h-[560px]">
        <PageHead kicker="Policy pathways" title="Three routes toward renewable energy adoption" sub="Switch pathways to trace the structural relationships used in the thesis interpretation." />
        <motion.div {...rise(1)} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_150px]" role="tablist">
          {(Object.keys(pathways) as (keyof typeof pathways)[]).map(k => (
            <button
              key={k}
              role="tab"
              aria-selected={pathway === k}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pathway === k ? 'border-primary/50 bg-card shadow-soft ring-2 ring-primary/30' : 'border-border bg-card hover:border-primary/30'}`}
              onClick={() => setPathway(k)}
            >
              <b className="font-serif text-2xl font-semibold text-primary">{pathways[k].effect.toFixed(3)}</b>
              <span className="text-sm font-bold">{pathways[k].name}</span>
            </button>
          ))}
          <Button variant="outline" className="h-full min-h-12 rounded-2xl" aria-pressed={autoplay} onClick={() => setAutoplay(!autoplay)}>
            {autoplay ? <Pause /> : <Play />}{autoplay ? 'Pause' : 'Auto-play'}
          </Button>
        </motion.div>
        <Panel {...rise(2)} className="grid min-h-0 grid-cols-1 overflow-hidden lg:flex-1 lg:grid-cols-[36%_64%]">
          <div className="overflow-y-auto border-b border-border p-5 lg:border-b-0 lg:border-r">
            <motion.div key={p.name} initial={{ opacity: 0, transform: 'translateX(-14px)' }} animate={{ opacity: 1, transform: 'translateX(0px)' }} transition={{ duration: 0.25, ease: easeOutStrong }}>
            <span className="text-sm font-extrabold tracking-wider text-primary">{p.formula}</span>
            <h2 className="my-2 font-serif text-2xl font-semibold leading-tight sm:text-3xl">{p.name}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
            <h3 className="mb-1 mt-4 text-sm font-bold">Illustrative examples</h3>
            <ul className="m-0 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              {p.examples.map(x => <li key={x}>{x}</li>)}
            </ul>
            <div className="mt-4"><Caution>Illustrative examples are not statistically derived from the SEM. Structural relationships are correlational, not causal.</Caution></div>
            </motion.div>
          </div>
          <div className="h-[200px] w-full min-w-0 border-t border-border lg:h-auto lg:min-h-[380px] lg:border-t-0">
            <SEMCanvas mode="pathway" activeNodes={p.activeNodes} activePaths={p.activePaths} interactive={false} />
          </div>
        </Panel>
      </div>
    </section>
  );
}

function PathwaysPrint() {
  return (
    <section className="page" data-page="pathways">
      <PageHead kicker="Policy pathways" title="Three routes toward renewable energy adoption" sub="The complete model remains visible while each pathway emphasizes its relevant relationships." />
      <div className="print-pathways grid gap-4">
        {(Object.keys(pathways) as (keyof typeof pathways)[]).map(k => {
          const p = pathways[k];
          return (
            <Panel key={k} className="p-5">
              <h2 className="font-serif text-2xl font-semibold">{p.name} · {p.effect.toFixed(3)}</h2>
              <p className="text-sm text-muted-foreground">{p.summary}</p>
              <SEMCanvas mode="pathway" activeNodes={p.activeNodes} activePaths={p.activePaths} interactive={false} />
            </Panel>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Evidence ---------------- */
function Evidence() {
  return (
    <section className="page h-full overflow-y-auto" data-page="evidence">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col justify-center gap-3 px-5 py-3 sm:px-8">
        <PageHead kicker="Results" title="All nine hypothesized paths are supported" sub="Fit is mixed — four of seven indices meet thresholds — and the two-indicator RA construct warrants caution." />
        <motion.div {...rise(1)} className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="p-4">
            <h2 className="mb-2 font-serif text-lg font-semibold">Model fit</h2>
            {fit.map(r => (
              <div className="grid grid-cols-[62px_1fr_1fr_62px] items-center gap-1.5 border-b border-border py-[3px] text-xs" key={r[0]}>
                <strong>{r[0]}</strong><span>{r[1]}</span><span>{r[2]}</span>
                <b className={`text-right ${r[3] === 'Meets' ? 'text-good' : 'text-gold'}`}>{r[3]}</b>
              </div>
            ))}
            <div className="mt-2"><CautionDetails summary="Fit is mixed — 4 of 7 indices meet thresholds">RMSEA, CFI, TLI, and χ²/df meet the stated thresholds, while GFI, AGFI, and NFI remain below 0.90. The chi-square test is significant; the full χ² statistic and df are not displayed in the thesis table.</CautionDetails></div>
            <div className="mt-2">
              <CautionDetails summary="Interpretation boundaries — cross-sectional, pooled, N = 120">
                <span className="grid gap-1">
                  {[
                    'Cross sectional data from 2022–2023; time effects were not tested.',
                    'Country-group moderation was not tested; pooling 120 countries may conceal heterogeneity.',
                    'N = 120 exceeds the cited minimum but is below the desirable N = 200; the free-parameter ratio is not reported.',
                    'Modification-driven respecification may increase specification-search and overfitting risk.'
                  ].map(x => <span key={x} className="block">· {x}</span>)}
                </span>
              </CautionDetails>
            </div>
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-2 font-serif text-lg font-semibold">Structural paths <small className="ml-2 text-[0.6875rem] font-normal text-muted-foreground">H1–H9</small></h2>
            {[...paths].sort((a, b) => Number(a.hypothesis.slice(1)) - Number(b.hypothesis.slice(1))).map(p => (
              <div className={`grid grid-cols-[36px_1fr_65px_60px] items-center gap-1.5 border-b border-border py-[3px] text-xs ${p.coefficient < 0 ? 'text-negative' : ''}`} key={p.id}>
                <strong>{p.hypothesis}</strong><span>{p.from} → {p.to}</span>
                <b className="text-right">{p.coefficient.toFixed(3)}</b><span className="text-right">{p.p}</span>
              </div>
            ))}
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-2 font-serif text-lg font-semibold">Reliability and validity</h2>
            {reliability.map(r => (
              <div className="grid grid-cols-[32px_1.25fr_1fr_72px] items-center gap-1.5 border-b border-border py-[3px] text-xs" key={r[0]}>
                <strong>{r[0]}</strong>
                <span>{constructs.find(c => c.id === r[0])?.name}</span>
                <small className="flex justify-end gap-3 text-[0.6875rem] text-muted-foreground"><span className="whitespace-nowrap">CR {r[1]}</span><span className="whitespace-nowrap">AVE {r[2]}</span></small>
                <b className={`text-right ${r[3].toLowerCase().includes('caution') ? 'text-gold' : 'text-good'}`}>{r[3]}</b>
              </div>
            ))}
            <div className="mt-2"><CautionDetails summary="RA construct requires caution">
              CR and AVE are calculated from the reported standardized loadings using conventional standardized-loading formulas:
              <span className="my-1 block font-semibold text-foreground">CR = (Σλ)² / [(Σλ)² + Σ(1 − λ²)]</span>
              <span className="mb-1 block font-semibold text-foreground">AVE = Σλ² / k</span>
              where λ is a standardized loading and k the number of indicators. RA is a two-indicator construct and RA2 loads weakly (0.303), so its reliability and convergent validity require caution.
            </CautionDetails></div>
          </Panel>
          <Panel className="p-4 xl:col-span-3">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <h2 className="m-0 font-serif text-lg font-semibold">Respecification <small className="ml-2 text-[0.6875rem] font-normal text-muted-foreground">MI &gt; 15</small></h2>
              <p className="m-0 text-[0.6875rem] leading-snug text-muted-foreground">4 cross-loadings (=~, green) · 15 residual covariances (~~). Select a row for its rationale.</p>
            </div>
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 xl:grid-cols-4">
            {modifications.map(m => (
              <details key={m.id} className="group border-b border-border">
                <summary className="grid cursor-pointer list-none grid-cols-[10px_1fr_46px_40px] items-center gap-1.5 py-0 text-[0.6875rem] leading-[1.5] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="inline-block text-primary transition-transform duration-200 group-open:rotate-90">›</span>
                  <strong className={m.type === 'cross-loading' ? 'text-primary' : ''}>{m.lhs} {m.type === 'cross-loading' ? '=~' : '~~'} {m.rhs}</strong>
                  <b className={`text-right ${m.estimate < 0 ? 'text-negative' : ''}`}>{m.estimate.toFixed(3)}</b>
                  <span className="text-right text-muted-foreground">{m.p}</span>
                </summary>
                <p className="mb-1.5 mt-0.5 pl-4 text-[0.6875rem] leading-snug text-muted-foreground">{m.note}</p>
              </details>
            ))}
            </div>
          </Panel>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Methods ---------------- */
function Fact({ a, b }: { a: string; b: string }) {
  return (
    <div className="rounded-xl border border-border px-2.5 py-1">
      <strong className="block text-xs font-bold">{a}</strong>
      <span className="block text-xs text-muted-foreground">{b}</span>
    </div>
  );
}

function Methods() {
  return (
    <section className="page h-full overflow-y-auto" data-page="methods">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col justify-center gap-3 px-5 py-3 sm:px-8">
        <PageHead kicker="Methods" title="Data, estimation, and analytical workflow" sub="The study combined WEF and WEC indicators and estimated the measurement and structural models in RStudio using lavaan." />
        <motion.div {...rise(1)} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel className="p-4">
            <h2 className="mb-1.5 font-serif text-lg font-semibold">Analytical workflow</h2>
            <ol className="my-1 list-decimal pl-5 text-xs leading-snug text-muted-foreground sm:columns-2 sm:gap-x-8">
              <li>Literature-led construct formulation</li>
              <li>Variable screening and retention of 27 continuous indicators</li>
              <li>Confirmatory factor analysis</li>
              <li>Model-fit review and theoretically justified respecification</li>
              <li>Structural equation modeling</li>
              <li>Interpretation of direct and pathway effects</li>
            </ol>
            <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
              <Fact a="Software" b="RStudio + lavaan" /><Fact a="Coverage" b="120 countries" /><Fact a="Data" b="WEF 2023 + WEC 2022" />
              <Fact a="Estimator" b="Not reported" /><Fact a="Missing data" b="Not reported" /><Fact a="Design" b="Cross sectional" />
              <Fact a="MI threshold" b="15" /><Fact a="Variables" b="27 continuous indicators" /><Fact a="Free parameters" b="Not reported" />
            </div>
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-2 font-serif text-lg font-semibold">Sample composition</h2>
            {sample.map(([name, n]) => (
              <div className="my-[5px] grid grid-cols-[1.7fr_1fr_28px] items-center gap-2 text-xs" key={name}>
                <span>{name}</span>
                <i className="h-2 overflow-hidden rounded-full bg-muted not-italic">
                  <b className="block h-full rounded-full bg-primary" style={{ width: `${(n / 31) * 100}%` }} />
                </i>
                <strong className="text-right">{n}</strong>
              </div>
            ))}
            <div className="mt-2"><Caution>The sample equals 4.4 observations per observed variable, but this is not the observations-per-free-parameter ratio. Estimate stability should therefore be interpreted with care.</Caution></div>
          </Panel>
          <Panel className="p-4 xl:col-span-2">
            <h2 className="mb-1.5 font-serif text-lg font-semibold">SEM glossary</h2>
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 xl:grid-cols-4">
            {glossary.map(([term, definition]) => (
              <details key={term} className="group border-b border-border py-1">
                <summary className="cursor-pointer list-none text-xs font-bold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-primary transition-transform duration-200 group-open:rotate-90">›</span>{term}
                </summary>
                <p className="mb-0 mt-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">{definition}</p>
              </details>
            ))}
            </div>
          </Panel>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Conclusion ---------------- */
function Conclusion({ onPrint, onCSV, onCopy, onStart }: { onPrint: () => void; onCSV: () => void; onCopy: () => void; onStart: () => void }) {
  return (
    <section className="page h-full overflow-y-auto" data-page="conclusion">
      <div className="mx-auto flex min-h-full max-w-[1500px] flex-col justify-center gap-3 px-5 py-4 sm:px-8">
        <PageHead kicker="Conclusion" title="What the model suggests for energy-transition strategy" sub="Renewable energy adoption is the central linking construct between upstream conditions and downstream energy system outcomes." />
        <motion.div {...rise(1)}>
          <BentoGrid className="md:grid-cols-4" items={[
            { title: 'Institutions matter upstream', meta: '01', description: 'Institutional quality strongly supports political commitment and the investment climate, shaping both state-led and market-led transition pathways.', icon: <Landmark className="h-5 w-5" /> },
            { title: 'Political commitment is pivotal', meta: '02', description: 'Political commitment has a strong direct association with renewable energy adoption and contributes through investment-climate effects.', icon: <Vote className="h-5 w-5" /> },
            { title: 'Access gains are substantial', meta: '03', description: 'Renewable energy adoption shows the strongest relationship in the model with access to modern energy (β = 0.931).', icon: <PlugZap className="h-5 w-5" /> },
            { title: 'Security effects require care', meta: '04', description: 'The negative association with energy security should be interpreted alongside intermittency, infrastructure readiness, and indicator orientation.', icon: <ShieldAlert className="h-5 w-5" /> }
          ]} />
        </motion.div>
        <Panel {...rise(2)} className="grid grid-cols-1 items-center gap-4 px-4 py-3 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Take-home message</span>
            <h2 className="my-1 font-serif text-xl font-semibold leading-tight sm:text-2xl lg:text-xl xl:text-2xl">Enable adoption, then strengthen system readiness.</h2>
            <p className="text-xs leading-snug text-muted-foreground">Institutions and political commitment help unlock renewable energy adoption. The access benefits are substantial, but system integration, flexibility, and reliability investments remain essential. This is an interpretation of cross sectional associations, not a tested intervention sequence.</p>
            <p className="mt-1 text-xs text-muted-foreground"><b className="text-foreground">Pathway effects:</b> Command-and-control 0.606 · Voluntary 0.310 · Market-based 0.300</p>
          </div>
          <div className="grid grid-cols-1 items-center gap-2 text-center sm:grid-cols-[1fr_24px_1fr_24px_1.2fr]">
            <span className="rounded-2xl border border-border px-3 py-2 text-xs sm:text-sm">Enabling conditions</span>
            <b className="text-primary" aria-hidden="true">→</b>
            <strong className="rounded-2xl bg-primary px-3 py-2 text-xs text-primary-foreground shadow-md shadow-primary/25 sm:text-sm">RE adoption</strong>
            <b className="text-primary" aria-hidden="true">→</b>
            <span className="rounded-2xl border border-border px-3 py-2 text-xs sm:text-sm">Access and security outcomes</span>
          </div>
        </Panel>
        <Panel {...rise(3)} className="flex flex-col items-start justify-between gap-2 px-4 py-2 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <h2 className="m-0 font-serif text-base font-semibold">Citation and poster actions</h2>
            <p className="my-0.5 text-[0.6875rem] leading-snug text-muted-foreground">{citation}</p>
            <small className="block text-[0.6875rem] text-muted-foreground">Contact: magtalasbernie@suou.waseda.jp</small>
            <small className="mt-0.5 block text-[0.6875rem] text-muted-foreground">
              Thesis result documents:{' '}
              {thesisResources.map(([label, url], i) => (
                <Fragment key={url}>
                  {i > 0 && ' · '}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</a>
                </Fragment>
              ))}
            </small>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-10 px-3.5 text-xs sm:h-8 sm:px-3" onClick={onPrint}><Printer />Print / save full poster</Button>
            <Button variant="outline" size="sm" className="h-10 px-3.5 text-xs sm:h-8 sm:px-3" onClick={onCSV}><Download />Download CSV</Button>
            <Button variant="outline" size="sm" className="h-10 px-3.5 text-xs sm:h-8 sm:px-3" onClick={onCopy}><Copy />Copy citation</Button>
            <Button size="sm" className="h-10 px-3.5 text-xs sm:h-8 sm:px-3" onClick={onStart}>Return to start</Button>
          </div>
        </Panel>
      </div>
    </section>
  );
}
