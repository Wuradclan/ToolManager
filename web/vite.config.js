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
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  
  build: {
    outDir: "dist"
  }
  }))
console.log("VITE BASE PATH:", process.env.NODE_ENV);
