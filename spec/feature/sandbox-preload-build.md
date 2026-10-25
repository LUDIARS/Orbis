# Sandboxed preload bundles

`SPEC-ORBIS-SANDBOX-PRELOAD-BUILD`: both preload entries must be standalone
CommonJS bundles. Their only runtime module dependency may be Electron's
sandbox-provided `electron` module. Shared application code must be bundled
into each entry, never emitted as a `require('./chunks/...')` dependency.

Use electron-vite 5's `build.isolatedEntries` and disable dependency
externalization for preload builds. Retain sandboxing, context isolation,
the limited IPC bridge and fail-closed window behavior.

electron-vite 5.0.0's isolated-entry reporter unconditionally calls stdout
cursor methods, including when Excubitor or CI pipes stdout. Supply only missing
cursor methods as inert operations on non-TTY output. Keep existing methods,
all output writes, build exceptions and terminal streams unchanged. This helper
is loaded only by the build configuration, not by the application runtime.

2026-10-25: starting through Excubitor produced a control discovery file, then
the process disappeared. Cc attach/open requests returned `orbis_unavailable`.
Both generated preloads required a shared IPC-contract chunk, which sandboxed
Electron cannot load. Shell windows destroy themselves on preload failure;
closing all windows then quits the human-mode application. This build defect
is confirmed; full runtime recovery must be verified after reviewed deployment.

Acceptance: build succeeds, both output bundles contain no external file
requires, the main-folder Excubitor launch stays alive, and Cc can attach and
open the requested provider pages. Provider login and remote task execution
are separate checks and must not be inferred from a successful page load.

References: https://electron-vite.org/guide/isolated-build and
https://www.electronjs.org/docs/latest/tutorial/sandbox .
