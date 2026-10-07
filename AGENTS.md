# Repository Guidelines

## Project Structure & Module Organization

This repository implements `rainy-running-simulator`, a website exploring the difference between simplified rain-exposure models and everyday experience.

- `project-overview.md` contains the project concept, modeling assumptions, and proposed progression of simulations.
- `implementation-plan.md` contains the initial implementation plan, interaction design, validation, and deployment approach.
- `AGENTS.md` provides contributor instructions.

- `src/simulation/` contains deterministic simulation logic, analytic models, the comparison Worker, and Vitest tests.
- `src/components/` contains React controls, SVG diagrams, and Three.js rendering.
- `src/App.tsx` assembles the experimental article; `src/style.css` provides responsive styles.
- `public/` contains static assets; `.github/workflows/pages.yml` validates and deploys to GitHub Pages.
- `README.md` documents setup, modeling approximations, and deployment.

Keep simulation logic separate from presentation code.

## Build, Test, and Development Commands

Use Node.js 22 (22.12 or later), 24, or 26 and later, with npm (CI uses Node.js 24).

- `npm ci`: install locked dependencies.
- `npm run dev`: start Vite at http://127.0.0.1:5173/.
- `npm run licenses`: regenerate third-party notices and public license files.
- `npm run build`: regenerate license notices, type-check, and produce static output in `dist/`.
- `npm run preview`: preview the production build.
- `npm test`: run deterministic Vitest tests.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run format:check`: verify Prettier formatting.
- `npm run format`: apply Prettier formatting.

Use `git diff --check` to catch whitespace errors in tracked changes.

## Coding Style & Naming Conventions

Use descriptive names that identify physical quantities and units, such as `distanceMeters` and `speedMetersPerSecond`. Keep numerical calculations independent of UI rendering. Explain assumptions and approximations alongside the model.

Use TypeScript strict mode and Prettier (2-space indentation, single quotes, trailing commas). Use professional technical language for code, identifiers, generated files, and commit messages.

## Testing Guidelines

Vitest tests live alongside simulation code as `*.test.ts` and run with `npm test`. Cover zero distance, invalid inputs, unit consistency, collision and occlusion, reproducibility, saturation, and expected relationships between distance, speed, and exposure. Use fixed seed ensembles and explicit tolerances for statistical comparisons against analytic models. No coverage target is set.

## Commit & Pull Request Guidelines

Use concise, imperative subjects, for example, `Add frontal rain exposure model`.

Pull requests should describe the change, modeling assumptions, and validation performed. Link relevant issues when available; include screenshots for visual changes. Distinguish verified results from hypotheses.

## Agent-Specific Instructions

When responding in Japanese, use an elegant お嬢様 tone (for example, 「〜ですわ」). Prioritize accuracy, explicitly label speculation, and keep explanations concise and logical.
