# AI Video Annotator Suite

## Overview
The AI Video Annotator Suite is an enterprise-grade, zero-cloud video analysis application designed for safety compliance and operational observability. It processes video data locally using on-device machine learning to detect Personal Protective Equipment (PPE) compliance, monitor restricted zones, and generate productivity metrics such as heatmaps and dwell times.

## Architecture & Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS
* **Machine Learning:** TensorFlow.js (COCO-SSD with MobileNetV2 backend)
* **State Management:** React `useReducer`
* **Backend & Persistence:** Supabase (PostgreSQL)
* **Observability:** OpenTelemetry (OTel)
* **Performance:** Dedicated Web Workers and `OffscreenCanvas` for non-blocking ML inference

## Core Features
* **Local AI Processing:** 100% on-device inference ensuring data privacy and GDPR/CCPA compliance.
* **Safety Compliance Detection:** Automated identification of PPE (hard hats, safety vests) and real-time alerts for missing gear.
* **Virtual Fencing:** Custom polygonal zone drawing (e.g., Restricted, Safety, Loading) with intrusion detection logging.
* **Operational Analytics:** Generation of activity heatmaps, path tracking, and dwell-time calculations to identify bottlenecks.
* **Human-in-the-Loop Refinement:** Interface for manual identity management, track merging, and bounding box adjustments.

## Development Setup

### Prerequisites
* Node.js (v18 or higher recommended)
* npm, yarn, or pnpm
* Supabase project instance

### Installation
1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd ai-video-annotator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables. Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the Application
Start the local development server:
```bash
npm run dev
```

## License & Copyright
**Copyright © 2026. All Rights Reserved.**
This repository and its contents are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.
