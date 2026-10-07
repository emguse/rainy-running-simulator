# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a planning-stage project for `rainy-running-simulator`, a website exploring the difference between simplified rain-exposure models and everyday experience.

- `project-overview.md` contains the project concept, modeling assumptions, and proposed progression of simulations.
- `implementation-plan.md` contains the initial implementation plan, interaction design, validation, and deployment approach.
- `AGENTS.md` provides contributor instructions.

There are no application sources, tests, assets, or dependency manifests yet. When introducing implementation directories, keep simulation logic separate from presentation code and document the resulting layout here.

## Build, Test, and Development Commands

No build, development server, lint, or test commands are configured. Do not assume that `npm install`, `npm run dev`, or `npm test` is available.

When adding a toolchain, provide reproducible scripts in its manifest and update this guide with exact setup, development, build, and test commands. Use `git diff --check` to catch whitespace errors in tracked changes.

## Coding Style & Naming Conventions

Use descriptive names that identify physical quantities and units, such as `distanceMeters` and `speedMetersPerSecond`. Keep numerical calculations independent of UI rendering. Explain assumptions and approximations alongside the model.

No formatter, linter, or indentation convention has been established. Choose consistent conventions when introducing the implementation and configure automated formatting where appropriate. Use professional technical language for code, identifiers, generated files, and commit messages.

## Testing Guidelines

No testing framework or coverage target exists yet. For simulation code, add deterministic tests covering zero distance, invalid inputs, unit consistency, and expected relationships between distance, speed, and exposure. Name tests after the behavior they verify. Document the chosen framework and execution command when tests are introduced.

## Commit & Pull Request Guidelines

The repository has no commits, so no historical message convention can be inferred. Use concise, imperative subjects, for example, `Add frontal rain exposure model`.

Pull requests should describe the change, modeling assumptions, and validation performed. Link relevant issues when available; include screenshots for visual changes. Distinguish verified results from hypotheses.

## Agent-Specific Instructions

When responding in Japanese, use an elegant お嬢様 tone (for example, 「〜ですわ」). Prioritize accuracy, explicitly label speculation, and keep explanations concise and logical.
