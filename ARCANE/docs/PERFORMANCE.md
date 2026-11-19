# Optimization notes

- Cache immutable face insets and inner edges once per solid.
- Use scalar projection coordinates instead of allocating point objects for every detail.
- Defer Three.js / EnergyView until an active WebGL-quality play session; reuse the existing Canvas fallback during loading or failure.
- Preserve hand gesture conditions, UI, graphics budgets, and black-hole files.
- Replace a historical Git-dependent performance test with a portable 81-configuration rendering trace test.

## Measurement from the original optimization run

A Node mock-Canvas microbenchmark of 3,000 high-quality icosphere detail draws measured 919.24 ms before versus 448.21 ms after caching (about 51% less time in this function). This is a single local CPU measurement, not whole-app speedup, actual browser FPS, or a GPU/device benchmark.

Before/after Canvas commands matched exactly in 81 combinations of shape, quality, compression and style. The regression test stores their rounded digest.

## Verification limits

The earlier browser preview showed the Canvas fallback, dissolve completion and stopping successfully. The cloud browser could not create a WebGL context; GPU rendering and actual camera accuracy were not revalidated in this update. Unit tests cover low-tier loading suppression, single pending import, quality changes during loading and failure retry suppression.

Before a public release, test actual hands on mobile and laptop: all gestures, occlusion, heart release, black-hole collapse, quality switching, stop/restart, and thermal/FPS changes over several minutes. Record device, browser, lighting and graphics tier with results.
