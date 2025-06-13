// vite.config.js
// @ts-ignore
import jsconfigPaths from 'vite-jsconfig-paths'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), jsconfigPaths()],
})
