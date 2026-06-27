<p align="center">
  <img src="docs/readme-banner.svg" alt="AI Video Annotator Suite — zero-cloud warehouse video analysis" width="720" />
</p>

<p align="center">
  <strong>Zero-cloud warehouse video analysis that runs entirely in your browser.</strong><br />
  Upload a clip and get live detection, tracking, virtual-fence zones, dwell times, heatmaps, and exportable reports. Your video never leaves your device.
</p>

<p align="center">
  <a href="https://dacameragirl.github.io/AI-Video-Annotator/"><img src="https://img.shields.io/badge/Live-GitHub%20Pages-41d99a?style=for-the-badge&logo=github&logoColor=061713" alt="Live demo" /></a>
  <a href="https://github.com/DaCameraGirl/hydra-evaluator-app"><img src="https://img.shields.io/badge/Related-Hydra%20Evaluator-6ba9ff?style=for-the-badge" alt="Hydra Evaluator" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/privacy-100%25%20local-41d99a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/license-All%20Rights%20Reserved-f0c45d?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/deploy-GitHub%20Pages-000000?style=flat-square&logo=github&logoColor=white" alt="GitHub Pages" />
  <img src="https://img.shields.io/badge/ML-TensorFlow.js-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" alt="TensorFlow.js" />
</p>

### Languages

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-97.6%25-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 97.6%" />
  <img src="https://img.shields.io/badge/CSS-2.4%25-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS 2.4%" />
</p>

### Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/COCO--SSD-browser%20inference-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" alt="COCO-SSD" />
  <img src="https://img.shields.io/badge/storage-IndexedDB-41d99a?style=flat-square" alt="IndexedDB" />
</p>

<p align="center">
  Built by <strong>Angela Hudson</strong> · <a href="https://github.com/DaCameraGirl">DaCameraGirl</a>
</p>

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Pipeline%20at%20a%20glance&fontSize=22&fontColor=f7f2e8" width="720" alt="Pipeline at a glance" /></p>

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart LR
  A[Upload video] --> B[COCO-SSD detect]
  B --> C[IoU tracking]
  C --> D[Zone fences]
  D --> E[Heatmap + dwell]
  E --> F[Caption QA]
  F --> G[Export report]

  style A fill:#111923,stroke:#41d99a,color:#f7f2e8
  style B fill:#111923,stroke:#6ba9ff,color:#f7f2e8
  style C fill:#111923,stroke:#6ba9ff,color:#f7f2e8
  style D fill:#111923,stroke:#f0c45d,color:#f7f2e8
  style E fill:#111923,stroke:#f0c45d,color:#f7f2e8
  style F fill:#111923,stroke:#41d99a,color:#f7f2e8
  style G fill:#111923,stroke:#41d99a,color:#f7f2e8
```

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=What%20it%20does&fontSize=22&fontColor=f7f2e8" width="720" alt="What it does" /></p>


- **Live detection + tracking** — COCO-SSD (TensorFlow.js) runs on every frame; a lightweight IoU tracker gives each object a stable id, so you get unique counts, movement trails, and dwell times.
- **Your warehouse terminology** — generic detections are relabeled with approved terms (worker, forklift, pallet jack, tall metal shelving) drawn from the companion terminology config.
- **Virtual-fence zones** — draw Restricted / Safety / Loading / Walking / Storage zones right on the video. The Suite counts occupancy and logs entries; a worker entering a Restricted zone is flagged as an intrusion.
- **Activity heatmap** — see where objects spend the most time, to spot bottlenecks and busy lanes.
- **Caption QA (all in one)** — the warehouse caption checker is folded in: generate a caption from the current frame, then score it against approved terminology and present-tense rules.
- **Local projects** — save and reload zone layouts via IndexedDB. Nothing is uploaded.
- **Export** — download a human-readable report (`.txt`) and structured data (`.json`).

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Honest%20about%20the%20AI&fontSize=22&fontColor=f7f2e8" width="720" alt="Honest about the AI" /></p>


This tool does not fake detections.

- Object labels are **real COCO-SSD detections** relabeled with warehouse terms. COCO-SSD has 80 generic classes; where there is a sensible equivalent it is renamed (`person → worker`, `truck → forklift`), otherwise the original label is kept. Nothing is invented.
- **PPE (safety vests) is a clearly-tagged estimate.** COCO-SSD has no "vest" or "hard hat" class, so the Suite samples colors inside a worker's torso region and surfaces a vest as an *estimate* only. Estimates are always marked `(est.)` and are never counted as confirmed detections.
- Gendered guesses are intentionally **not** used (the terminology rules ban them); a detected person is a "worker".

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Tech%20stack&fontSize=22&fontColor=f7f2e8" width="720" alt="Tech stack" /></p>


<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=111" alt="Frontend" />
  <img src="https://img.shields.io/badge/Inference-TensorFlow.js%20COCO--SSD-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow.js" />
  <img src="https://img.shields.io/badge/Hosting-GitHub%20Pages-000000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Pages" />
</p>

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- TensorFlow.js (COCO-SSD, lite MobileNet-v2 backend)
- IndexedDB for local persistence
- GitHub Actions → GitHub Pages

No backend, no database, no API keys.

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Run%20locally&fontSize=22&fontColor=f7f2e8" width="720" alt="Run locally" /></p>


```bash
npm install
npm run dev
```

- Build: `npm run build` (output in `dist/`)
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Deploy&fontSize=22&fontColor=f7f2e8" width="720" alt="Deploy" /></p>


Pushing to `main` triggers `.github/workflows/deploy-pages.yml`, which builds the app and publishes `dist/` to GitHub Pages. The Vite `base` is set to `/AI-Video-Annotator/` for the project-page URL.

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Project%20structure&fontSize=22&fontColor=f7f2e8" width="720" alt="Project structure" /></p>


```
src/
  ml/            COCO-SSD loader + per-frame inference
  lib/           tracking, zones, heatmap, caption QA, export, IndexedDB, terms
  components/    VideoPlayer (stage), CanvasOverlay (draw), side panels
  App.tsx        app shell
```

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=Related%20work&fontSize=22&fontColor=f7f2e8" width="720" alt="Related work" /></p>


This repo is **only** the warehouse video annotator. Project Hydra image A/B evaluation lives separately in [hydra-evaluator-app](https://github.com/DaCameraGirl/hydra-evaluator-app).

This Suite consolidates earlier warehouse tooling into one home:

- **Warehouse-Annotator** — original caption checker (folded in, archived)
- **Warehouse-Caption-Checker** — terminology QA rules (folded in, archived)

<p align="center"><img src="docs/readme-divider.svg" width="720" alt="" /></p>
<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0b1010&height=50&section=header&text=License&fontSize=22&fontColor=f7f2e8" width="720" alt="License" /></p>


Copyright © 2026 Angela Hudson. All Rights Reserved. See [LICENSE](LICENSE). Viewing this repository does not grant a license to use the code.

<p align="center">
  <a href="https://dacameragirl.github.io/AI-Video-Annotator/"><img src="https://img.shields.io/badge/Try%20it-live%20warehouse%20demo-41d99a?style=for-the-badge&logo=github&logoColor=061713" alt="Live demo" /></a>
</p>