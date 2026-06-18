# Hydra Evaluator

Local Project Hydra image-response evaluation helper. Paste a Hydra task, load the input and Response A/B images, choose ratings, and draft a concise justification in Angela's preferred comparison style.

**Live:** https://dacameragirl.github.io/AI-Video-Annotator/

Built by Angela Hudson / DaCameraGirl.

## What It Does

- **Prompt parsing**: paste the full task text and pull out the prompt plus storage image links when possible.
- **Side-by-side image review**: view the input, Response A, and Response B together with URL or file-drop loading.
- **Prompt checklist**: split the prompt into concrete details to watch for while rating.
- **Hydra ratings**: record overall preference, instruction following, correctness, visual quality, and naturalness.
- **Justification drafting**: generate 2 to 5 sentence explanations that start with `Response A/B is better than Response A/B.`
- **No em dashes**: generated text replaces em dashes so it matches Angela's requested style.

## Evaluation Notes

This app does not automatically judge image quality yet. It is a fast local workbench for careful human review. Treat it as a helper for:

- preserving the original subject, pose, background, and requested invariants
- separating instruction following from correctness
- calling out extra unwanted objects or changed scene details
- writing specific, plain-language justifications under time pressure

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Local browser state only
- GitHub Pages deployment

No backend, no database, no API keys.

## Run Locally

```bash
npm install
npm run dev
```

Checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## CI and Deploy

Pull requests and pushes to `main` run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

The repo is configured for GitHub Pages at:

```text
https://dacameragirl.github.io/AI-Video-Annotator/
```

The Vite `base` stays `/AI-Video-Annotator/` because the GitHub repository name still controls the Pages URL.

Pushes to `main` deploy the built `dist/` site through GitHub Pages.

## Repo Workflow

- Work on feature branches.
- Run lint, typecheck, and build before opening PRs.
- Keep Hydra wording plain and specific.
- Keep generated justifications free of em dashes.
- Use issues for follow-up automation, vision-model support, and rating workflow improvements.

## License

Copyright (c) 2026 Angela Hudson. All Rights Reserved. See [LICENSE](LICENSE).
Viewing this repository does not grant a license to use the code.
