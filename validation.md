# Initial implementation validation

Validated on 2026-10-07 (Asia/Tokyo).

## Automated checks

- Vitest: deterministic geometry, invalid inputs, zero distance/rain, fixed-seed reproducibility, pause and parameter changes, wet-mask overlap and saturation, geometric exposure masks, and particle capacity.
- Statistical check: eight fixed seeds at each of 1.5 and 3 m/s against the straight-box front/top analytic water volumes, with a 15% relative tolerance. Rear, bottom, and lateral face collision counts must be zero for this model.
- TypeScript strict type check and Vite production build.
- Prettier formatting and Git whitespace checks.
- Dependency installation audit: no known vulnerabilities after updating Vitest to 5.0.3.

## Browser checks

Codex in-app browser:

- 390 × 844 and 1200 × 900 viewports: no document horizontal overflow, visible 3D scene and controls.
- Text enlargement to 200% at 390px: controls remain operable; the responsive grids adapt to text size. This checks font enlargement, not a separate browser zoom implementation.
- Start/pause, attack-angle keyboard adjustment to 90°, preserved wetness after a parameter change, and geometric exposure overlay.
- 500m comparison Worker completes and displays coverage and cumulative-water graphs. Short-distance comparison and resetting are also checked during final UI validation.
- Browser console checked for errors and warnings.

## Performance checks and limits

A local Node.js 26 benchmark isolates simulation CPU cost; it does not measure browser GPU performance:

- 600 steps at default settings: median about 0.02ms, p95 about 0.08ms per step.
- 600 steps at 100mm/h rain, 1m/s fall speed, 8m/s movement: median about 0.77ms, p95 about 2.31ms per step.
- A 500m run at 100mm/h rain, 1m/s fall speed, 1.5m/s movement completed 20,000 steps (333.3 simulated seconds), with at most 3,955 particles and no capacity error. Wall time was about 13.5 seconds. These timings are indicative and machine-dependent; they were collected before the final initialization-shadow correction.

Particles and wet grids have fixed capacity. Per-step temporary arrays remain subject to garbage collection. Browser rendering displays only a subset of particles, reduces rendering detail under load, and keeps simulation time separate from wall time.

Real mobile hardware and long-duration browser memory profiling are not yet validated. The production bundle includes Three.js and currently triggers Vite's 500kB chunk-size warning (approximately 206kB gzip for the main JavaScript bundle). No deployment or GitHub Actions run has been performed locally.

## Comparison usability update

- Saved a completed 10m experiment at 1.5m/s, changed the chart-side speed to 3m/s, reset and completed a second experiment. The first record retained its conditions and result (6.7s, 13.3mL); the second showed 3.3s, 8.8mL.
- Verified the three-record limit, removal, and starting a fresh experiment from a saved record without deleting other records.
- Verified chart-side attack-angle changes propagate to both slider panels, mark the old chart stale, and are used by explicit recalculation.
- At this earlier stage, chart calculations compared the fixed 1.5m/s baseline against the shared speed setting; equal speeds produce identical fixed-seed results. Short/long presets synchronize the shared distance.
- Automated simulation checks remain 15 passing tests; strict type checking, production build, and formatting pass.

## Accelerated playback update

- Steve playback defaults to 20× and offers 1×, 5×, 20×, 100×, and 200×. Playback rate changes scheduling only; the simulation still advances at 1/60s per step.
- Browser replay at 20× and 200× with the same default conditions and seed produced identical displayed results: 106.7mL, 10.8% whole-surface wetness, and 66.7 simulated seconds over 100m.
- Processing keeps the approximately 12ms per-frame budget. At high load, actual acceleration can fall below the selected rate; this is shown explicitly.
- The 15 simulation tests, production build/type check, formatting, and whitespace checks pass.

## Learning progression and control update

- Added the inverted-L experiment between the vertical segment and the box. Its pure model tests verify constant frontal expectation, inverse-speed roof expectation, zero distance, zero fall speed/depth, and invalid input. All 18 tests pass.
- Browser speed change from 1.5 to 3m/s with distance 4m, fall speed 0.5m/s, roof depth 0.25m and density 6 points/m² retained 43.2 frontal expected hits and halved roof expected hits from 2.0 to 1.0.
- Box introduction now explains assumptions and the front/top exposure relationships without numerical dimensions or water-volume results linked to Steve controls.
- Both crab-angle panels start collapsed, show the current angle in their summaries, and share changes. Changing Steve's angle to 90° updates the collapsed comparison summary and marks the previous result stale.
- Comparison now fixes speeds at 1.5 and 3.0m/s and omits its speed controls. A 10m browser comparison shows 6.7s/13.3mL for walking and 3.3s/8.8mL for running.
- Horizontal-axis switching reuses the same traces. Time-axis endpoints occur at walking arrival and half that time for running; no post-arrival continuation is drawn. Distance-axis endpoints align at the selected distance.
- At 390px width, document scroll width remains 390px. Production build/type checking and formatting pass; the existing bundle-size warning remains.
