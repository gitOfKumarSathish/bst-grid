# Publishing to GitHub Packages

The repository's **Packages** section reads only from **GitHub Packages**
(`npm.pkg.github.com`). Packages on npmjs.com never appear there, however the
`repository` field is set — which is why the section says *"No packages
published"* even though all four `@bloomskill/table-*` packages are live on npm.

This repo mirrors each release to GitHub Packages so that section is populated.
npmjs.com stays the real distribution channel.

## The two rules that shape the setup

**1. The npm scope must equal the account that owns the repository.**
GitHub rejects a publish whose scope doesn't match the owner, so
`@bloomskill/table-engine` cannot be published under a repo owned by
`gitOfKumarSathish`. The mirror republishes the same tarball as
`@gitofkumarsathish/table-engine` (GitHub lowercases scopes). The npmjs.com
names are untouched.

**2. Even a *public* GitHub Packages npm package needs a token to install.**
Unlike the container registry, `npm.pkg.github.com` has no anonymous read: a
consumer without a personal access token gets a 401. So the mirror is for
**visibility**, not distribution — nobody should be told to install from it.

Because of rule 2, keep pointing users at npm:

```bash
npm i @bloomskill/table-engine @bloomskill/table-mui
```

## How it runs

`.github/workflows/publish-github-packages.yml` mirrors the release **when a
version bump lands on main** — it watches `version.ini`, which is the single
source of truth for the version and is only ever rewritten by `npm run
version:*`. So it fires exactly once per release, with no tag to remember, and
stays quiet on ordinary merges.

That file-watching trigger is the reason it isn't simply "on every push to
main": a version can only be published once, so a mirror that ran on every merge
would attempt to republish the same version and fail. Cutting a GitHub Release
also mirrors, and **Actions → publish-github-packages → Run workflow** re-runs it
by hand (after a failed publish, say). It authenticates with the
built-in `GITHUB_TOKEN` (via `permissions: packages: write`), so **there is no
secret to configure** — nothing to set up before the first run.

The workflow checks out, `npm ci`, `npm run build`, runs the naming guard, then
calls `scripts/publish-github-packages.mjs`, which for each package:

1. rewrites `name` to the owner scope and points `publishConfig.registry` at
   GitHub Packages,
2. publishes,
3. restores the original `package.json` — the tree is left byte-identical, on
   success or failure.

An already-published version is skipped rather than failing the run, so a
re-run after a partial failure is safe. The script refuses to run if `dist/` is
missing: npm would otherwise publish a manifest-only tarball that looks correct
in the UI and imports as `undefined`.

### What is deliberately *not* rewritten

The adapters' `@bloomskill/table-engine` peer dependency keeps its npmjs name.
The compiled `dist/` imports that exact specifier, so renaming it in the
manifest alone would ship an adapter whose declared peer never matches its own
imports. The mirrored adapters peer-depend on the engine as published to npm.

## Running it by hand

```bash
npm run release:ghp
```

That builds and mirrors. It needs a token with `write:packages` in `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<a PAT with write:packages>
```

Preview without publishing anything:

```bash
node scripts/publish-github-packages.mjs --dry
```

## Consuming the mirror (rarely what you want)

Only if you specifically need the GitHub copy — a consumer must authenticate
even though the packages are public:

```
@gitofkumarsathish:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<a PAT with read:packages>
```

```bash
npm i @gitofkumarsathish/table-engine
```

## If you'd rather have `@bloomskill` on GitHub too

Rule 1 is about the *owner*, not the person. Creating a GitHub organisation
named `bloomskill` and transferring this repo into it would let the GitHub
Packages names match npm exactly (`@bloomskill/table-engine` in both places),
and the mirror script picks the new owner up automatically from
`$GITHUB_REPOSITORY_OWNER` — no code change.

The cost is a repo transfer: the git remote, the Pages URL
(`gitofkumarsathish.github.io/bst-grid` → `bloomskill.github.io/bst-grid`), and
the `repository`/`homepage`/`bugs` URLs in all four `package.json`s and the docs
would all need updating. Worth doing once if the `@bloomskill` brand is
long-term; not required for the Packages section to work.
