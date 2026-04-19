# Chaos Painter

Chaos Painter has grown into a small browser-based studio with two labs:

- a chaotic double-pendulum playground for numerical methods and visual trajectories
- a fractal studio for recursive geometry, adaptive detail, and generative graphics

The point is not to hide the math behind a physics engine. The point is to expose the approximation itself.

## What the app does

- Simulates a planar double pendulum with custom equations of motion
- Includes a dedicated fractal tab with worker-based scene generation
- Implements multiple numerical methods manually in code, including Euler, RK2 variants, RK3 variants, RK4 variants, and Dormand-Prince RK5
- Lets you tune initial angles, angular velocities, masses, rod lengths, gravity, dt, and simulation length
- Lets you tune fractal depth, branching, scale, palette, glow, and animation
- Renders the motion as:
  - 2D pendulum view
  - 2D trail view
  - 3D extruded trail view
  - chaos-art mode for long-form generative patterns
- Renders recursive fractals such as a tree, Koch snowflake, and Sierpinski triangle
- Compares the full set of integrators side by side with identical initial conditions
- Shows energy drift and divergence metrics over time
- Exports the current viewport as PNG
- Runs entirely in the browser and can deploy as a static GitHub Pages site

## Why the methods look different

All integrators approximate the same differential equations, but they introduce different truncation errors.

- Euler is first-order. It is cheap and crude. With a chaotic system and a coarse `dt`, it quickly injects fake energy and noticeably distorts the motion.
- RK2 / Midpoint is second-order. It behaves better than Euler, but still diverges from higher-quality solutions over longer horizons.
- RK4 is fourth-order. For the same `dt`, it is usually the most faithful method in this app and tends to preserve the overall structure much better.

Because the double pendulum is chaotic, even small numerical differences grow over time. That is the whole show.

## Project structure

```text
src/
  app/
    model.ts            # UI-facing settings and conversions to simulation inputs
    presets.ts          # Curated presets for illustration and art
  components/
    ControlsPanel.tsx   # Sidebar controls and preset launcher
    FractalStudio.tsx   # Fractal lab UI + worker orchestration
    StudioViewport.tsx  # Single-view workspace
    ComparisonView.tsx  # Side-by-side method comparison
    MetricsPanel.tsx    # Energy + divergence charts
    TrajectoryCanvas2D.tsx
    ThreeTrailView.tsx
  fractals/
    buildScene.ts       # Worker-side fractal geometry generation
    types.ts
    workerClient.ts
    workerProtocol.ts
  integrators/
    euler.ts
    midpoint.ts
    heun.ts
    ralston.ts
    rk3.ts
    bogackiShampine.ts
    rk4.ts
    rk4_38.ts
    dopri5.ts
    index.ts
  physics/
    types.ts
    pendulum.ts         # Double-pendulum equations of motion and kinematics
    energy.ts           # Total energy + drift helpers
    stateMath.ts        # State vector arithmetic for integrators
  render/
    canvas2d.ts         # 2D pendulum / trail drawing
    fractals.ts         # Fractal canvas rendering from worker-built scene data
    trajectory3d.ts     # 2D dynamics projected into 3D
  simulation/
    simulateTrajectory.ts
    comparison.ts
  workers/
    simulationWorker.ts
    fractalWorker.ts
```

## Local development

### Prerequisites

- Node.js 22 LTS
- npm 10+

The repo includes `.nvmrc` and `.node-version` pinned to `22`, and the local shell on this machine is configured to prefer Homebrew `node@22`.

### Run locally

```bash
npm install
npm run dev
```

The app will start on the Vite dev server.

### Production build

```bash
npm run build
```

If your shell still picks the wrong Node version, verify with:

```bash
node --version
npm --version
```

Expected output is roughly:

```bash
v22.x
10.x
```

## GitHub Pages deployment

The repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

### Recommended setup

1. Push the repository to GitHub.
2. Ensure the default branch is `main`.
3. In GitHub, open `Settings -> Pages`.
4. Set the source to `GitHub Actions`.
5. Push to `main` and the workflow will build and deploy `dist/`.

`vite.config.ts` automatically derives the repository base path from `GITHUB_REPOSITORY` in production, which keeps asset URLs correct for GitHub Pages project sites.

## Numerical notes

- State vector: `[theta1, omega1, theta2, omega2]`
- Equations: planar double pendulum in generalized coordinates
- Physics and rendering are intentionally separated
- The simulation precomputes trajectories when parameters change

That last point is deliberate. Playback then becomes deterministic and repeatable, so what you are seeing is the integrator difference, not browser-frame jitter pretending to be science.

## Suggested explorations

- Keep the initial conditions fixed and switch between low-order and high-order methods.
- Increase `dt` until Euler starts bleeding energy hard.
- Compare Euler vs RK4 and watch the trails separate.
- Switch to 3D mode and use `z = time` or `z = energy drift`.
- Use chaos-art mode with long trajectories and color by speed or energy drift.

## Future extensions

- Overlay comparison mode in a single viewport
- Additional integrators such as symplectic or adaptive RK methods
- CSV / JSON export of trajectories
- Multi-seed ensemble visualizations
