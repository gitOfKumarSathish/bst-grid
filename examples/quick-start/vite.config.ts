import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fixed port so CodeSandbox's preview (see .codesandbox/tasks.json) maps correctly.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true },
})
