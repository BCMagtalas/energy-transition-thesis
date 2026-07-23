# Energy Transition Thesis

An interactive academic poster for the MA thesis **"Charting the Path to Net Zero: Investigating the Underlying Constructs Shaping the Energy Transition Landscape"** by Bernie Calderon Magtalas (Graduate School of Asia-Pacific Studies, Waseda University, 2024).

Built with React 18 + TypeScript + Vite 6, Tailwind CSS v4 with shadcn/ui-style design tokens, framer-motion, and Three.js.

## Run locally

```bash
npm install
npm run build
npm run audit
npm run dev
```

Open the Vite URL, normally `http://localhost:5173/`.

## Design system

The visual identity is an "Organic Biophilic" academic direction (generated with the ui-ux-pro-max design-intelligence skill, persisted to `design-system/net-zero-sem-atlas/MASTER.md`): emerald primary on soft-mint/deep-forest backgrounds, Crimson Pro serif headings with Atkinson Hyperlegible body text, rounded organic shapes, and full light/dark themes (toggle persists; follows the system preference initially). Component patterns (staggered hero, hover-lift bento grid, button primitive) are adapted from the 21st.dev catalog.

## Structure

Seven one-viewport sections: **Overview** (animated WebGL hero), **Background**, **Model** (interactive SEM), **Pathways**, **Evidence**, **Methods**, and **Conclusion**. Each fits a desktop viewport at 100% zoom and scrolls gracefully on shorter windows; mobile stacks naturally.

### Interactive SEM

Browser-safe SVG diagram with seven latent constructs and nine structural paths: hover tracing, node/coefficient selection with an evidence inspector, keyboard activation, pan, ⌘/Ctrl+wheel zoom, and pathway spotlighting with autoplay.

### Evidence

Model fit, structural estimates (H1–H9), reliability/validity (CR/AVE with formulas), and the full thesis-reported respecification: 4 cross-loadings and 15 residual covariances with per-row theoretical rationales. CSV export includes both the structural paths and all modifications.

### Hero scenes

Five self-contained Three.js vignettes (no external photo/video assets): a dawn wind farm, a smoggy industrial dusk, a night cooperation globe, a fast-sunrise solar array with tracking panels, and a net-zero particle ascent — all with soft-sprite particles and per-scene UnrealBloom post-processing, code-split off the critical path. Under `prefers-reduced-motion`, scenes run at a much gentler pace instead of freezing.

## Accessibility & output

WCAG-minded contrast on both themes, visible focus states, aria labels and live regions, reduced-motion support, a full multi-page print route (Print / save full poster), citation copy with clipboard fallback, and CSV download.

## Deployment

Published at https://bcmagtalas.github.io/energy-transition-thesis/ via GitHub Pages (`.github/workflows/deploy.yml` builds and deploys on every push to `main`).

## Source hierarchy

The final thesis is authoritative for model specification, methods, coefficients, factor loadings, fit indices, and limitations. The Summary of Thesis supplies concise synthesis and pathway framing where consistent with the final thesis. Respecification estimates come from the thesis results document ("Summary of Resulting Factor Loadings, Regression Coefficients, Residual Correlation Coefficients, and P-Values").
