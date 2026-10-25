# SPEC-ORBIS-AI-ONLY: Cc-controlled test browser

2026-10-25 neco request: isolate AI test authentication, forbid human operation,
accept control only from Cc, and restrict access to LUDIARS services.

Task reference: `actio:49f40250-3f57-4e8b-8b89-41f7dae7b0c1` (progress is owned by Actio).

## Contract

- `ORBIS_MODE=ai-only` selects a separate process lifecycle before the ordinary
  UI bootstrap. Unset mode keeps ordinary operation; unknown values fail closed.
- User data, Chromium session data, cookies and SQLite live in the sibling
  `orbis-ai-only` profile, never copied/imported from the human profile. AI pages
  share only the dedicated AI session. Authentication to applications is still
  performed normally with AI test accounts; this mode does not bypass login.
- No shell, toolbar, shortcuts, visible windows, file picker, downloads, external
  protocol handler, popup or reveal. Cc may read screenshots and operate offscreen
  pages. `visible:true`, external search and human reveal return errors.
  Native HTTP-auth and client-certificate prompts are cancelled; OS client
  certificates are not reused. File-picker dialogs are intercepted through CDP.
  An additional response CSP sandbox permits scripts/origin/forms but not modals,
  blocking page-triggered printing as well as script dialogs. Existing site CSPs
  remain intact and continue to apply.
- Cc must supply a dedicated 256-bit bearer secret injected as
  `ORBIS_AI_CC_TOKEN` (43 base64url characters), stable client ID and current
  Excubitor instance ID. The secret is never loaded from the human SQLite DB or
  written to discovery. Excubitor verification is mandatory, including on every
  request; configuration/unavailability denies access. Browser Origin headers
  are rejected. Local OS administrators able to inspect the Cc process/secrets
  remain outside the application-level isolation boundary.
- Deployment supplies `ORBIS_AI_ALLOWED_ORIGINS` as a nonempty JSON array of exact
  LUDIARS service origins, taken from service-owned Excubitor catalogs/approved
  public endpoints. No wildcard, path, credentials, or broad localhost rule.
  Only HTTPS or explicitly listed loopback HTTP is supported. This configuration
  is trusted deployment policy, never supplied by a page or an MCP tool.
- The same immutable origin policy covers navigation, frames, redirects, fetch,
  workers and WebSocket handshakes. A mandatory local forward proxy additionally
  restricts Chromium transport destinations. Direct UDP/QUIC is disabled; WebRTC
  uses the proxy. Non-network `about:blank` is only an initial empty document.
  Secure WebSockets use CONNECT; plaintext WebSocket upgrades are refused.
- Missing token, origins, or Excubitor endpoint is a startup error. No downgrade
  to the human browser or token-only authorization.
- Discovery in the AI profile contains only port, mode and browser sigillum.
  Cc attaches to that sigillum and uses existing Vinculum tools. Closing a page
  releases its renderer and revokes its sigillum; at most 16 pages stay open.

## Scope and evidence

Base: Orbis `1873d3f`. Existing Vinculum and CDP operations are Electron-only.
The native Tela/CEF host has no Vinculum integration yet (`SPEC-ORBIS-TELA-CEF`).
This explicit mode uses the existing Electron runtime; native launch must reject
AI mode rather than silently opening an unrestricted human window.

Pf project `01M3FVMG165NEZP7D28E1MJ3HC`, UX revision 1, describes the existing
interest-graph browser, not this isolation feature. Anatomia `context --project
orbis` links Sigillum/Vinculum to `src/main/{sigillum,vinculum}`; cache persistence
reported EPERM. Repository specifications and source are the implementation basis.

## Review acceptance (execution not yet performed)

1. Human cookies/storage/token are unavailable in AI mode; restart retains only
   the AI profile and invalidates previous page capabilities.
2. Missing/incorrect bearer, instance, browser Origin and unavailable Excubitor
   cannot call tools. Disabling the normal peer-verification setting has no effect.
3. Allowed services load; lookalike hosts, alternate ports, userinfo, offsite
   redirects, subframes, fetch, workers, WebSockets and external protocols fail.
4. No input surface becomes visible on startup, activation, second instance,
   popup, `visible:true` or reveal. Screenshots remain available through Cc.
5. Startup failure and shutdown release server, proxy sockets, pages and DB.

Deployment must provision the dedicated Cc secret, catalog-derived exact origins
and Excubitor URL before enabling the service. No real credentials are checked in.

## Deployment handoff

1. Build the merged Orbis checkout with `npm run build`. Excubitor owns the
   `orbis-ai-only` entry (autostart disabled); do not launch from a worktree.
2. Inject a newly generated secret through the existing secret store into Cc
   and `orbis-ai-only` as `ORBIS_AI_CC_TOKEN`. Do not copy the human Vinculum token.
3. Set `ORBIS_AI_ALLOWED_ORIGINS` to JSON containing only the required LUDIARS
   application/API origins resolved from their current catalogs. Include exact
   authentication origins only when owned by LUDIARS; third-party login redirects
   are deliberately blocked. Set the catalog-resolved Excubitor management URL.
4. Cc reads `<appData>/orbis-ai-only/vinculum.json`, uses its `browserSigillum`,
   and sends the dedicated bearer with `x-orbis-client-id` and
   `x-orbis-instance-id`. The normal human-mode client script is not an AI-mode
   credential source. `orbis_close` releases pages without revealing them.
5. Review acceptance requires a real Cc session and AI test account. Type checking
   or building does not establish that deployment credentials or UI isolation work.

API references checked: [Electron webRequest](https://www.electronjs.org/docs/latest/api/web-request),
[Electron webContents](https://www.electronjs.org/docs/latest/api/web-contents).

Implementation validation on 2026-10-25: TypeScript `tsc --noEmit` and
`npm run build` succeeded. After neco approved the review-environment work and
necessary validation, all 42 Vitest files / 162 cases passed, including the
36 new isolation cases. These include real HTTP authorization/proxy fixtures;
they are not evidence of an Electron desktop startup or real account login.
All four native translation units passed the compiler static analyzer with
the configured C++20 definitions and existing CEF/Tela SDK headers. No native
or Electron application was launched by these checks.
Genius CLI lacked a working-directory configuration; design relied on the current
repository contracts and the explicit neco request rather than unavailable cards.

## Native review prerequisites

`praesidium.json` enumerates all four native translation units. The repository
requests named header packages `orbis-cef-152` and `orbis-tela`; it never selects
host paths or compiler executables. The review host owns these mappings outside
the checkout. CEF 152.0.6 and the matching Tela installation's header trees were
copied to a stable local inspection directory and SHA-256 compared file by file.
Existing host mappings are preserved. The old task worktree is not a runtime
dependency of the installed copies.

The host-package mechanism is the concurrent Revisor change
`fix/native-preflight-libraries`, described by `RV-PRAESIDIUM-03`. Its reviewed
landing is a prerequisite to resubmitting Orbis #3454. Do not exclude native files,
disable preflight, or run repository setup before the security inspection.
Tracking: `actio:d5fee66a-908c-41c7-b92f-b528aa3a4523`.
