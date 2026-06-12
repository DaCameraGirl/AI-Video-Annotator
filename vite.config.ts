import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deployed to GitHub Pages at https://dacameragirl.github.io/AI-Video-Annotator/
// so assets must be served from that sub-path.
export default defineConfig({
  base: '/AI-Video-Annotator/',
  plugins: [react(), tailwindcss()],
})
