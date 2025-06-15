import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
//added 
import tailwindcss from "@tailwindcss/vite";

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: "/",
  }))
