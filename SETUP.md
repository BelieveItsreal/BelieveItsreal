# Self-hosted activity graph — setup

This replaces `github-readme-activity-graph.vercel.app` /
`.cyclic.app` with something that lives entirely inside your own
profile repo. Nothing external to GitHub is involved, so there's no
shared server that can run out of quota or go down.

How it works: a scheduled GitHub Action runs a small script that asks
GitHub's own API for your contribution history, draws it as an SVG,
and commits that SVG back into the repo. Your README then just points
at that SVG file with a normal `raw.githubusercontent.com` link.

## 1. Copy these files into your profile repo

Your profile repo is the one named exactly like your username
(here, `BelieveItsreal/BelieveItsreal`). Copy in:

```
scripts/generate-graph.mjs
.github/workflows/update-activity-graph.yml
```

## 2. Check the workflow's `GH_USERNAME`

Open `.github/workflows/update-activity-graph.yml` and confirm
`GH_USERNAME: BelieveItsreal` matches your username (it already does
here, just double-check if you rename anything).

## 3. (Optional) Use a personal access token instead of the default token

The workflow uses `secrets.GITHUB_TOKEN`, which GitHub provides
automatically — no setup needed, and it's enough to graph your
*public* contributions. If you want private-repo contributions
counted too:

1. Go to GitHub → Settings → Developer settings → Personal access
   tokens → Tokens (classic) → Generate new token, with the
   `read:user` scope.
2. In your profile repo: Settings → Secrets and variables → Actions →
   New repository secret, name it `GRAPH_TOKEN`, paste the token.
3. In the workflow file, change `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
   to `GH_TOKEN: ${{ secrets.GRAPH_TOKEN }}`.

## 4. Run it once

Push the files, then go to the Actions tab → "Update activity graph" →
"Run workflow" to trigger it manually the first time. It will commit
`dist/activity-graph.svg` into your repo.

## 5. Update your README

Replace the old `<img>` in your README with:

```html
<p align="center">
  <img
    src="https://raw.githubusercontent.com/BelieveItsreal/BelieveItsreal/main/dist/activity-graph.svg"
    width="95%"/>
</p>
```

(swap `main` for your default branch name if it's different, e.g. `master`)

After that, the graph refreshes itself once a day automatically —
no third-party service, no quota, nothing to break.

## Customizing

Env vars read by `scripts/generate-graph.mjs` (set in the workflow's
`env:` block):

| Var | Default | What it does |
|---|---|---|
| `GRAPH_DAYS` | `31` | how many trailing days to plot |
| `THEME` | `tokyo-night` | `tokyo-night` or `light` |
| `OUTPUT_PATH` | `dist/activity-graph.svg` | where the SVG is written |
