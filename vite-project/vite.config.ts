import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import fs from 'fs'
import type { UserConfig } from 'vite' // optional but helpful

export default defineConfig(({  }) => {
  const isVercel = process.env.VERCEL === '1'
  const useHttpsLocally =
      !isVercel &&
      fs.existsSync('./localhost-key.pem') &&
      fs.existsSync('./localhost.pem')

  const baseConfig: UserConfig = {
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    server: {
      allowedHosts: ['.ngrok-free.app', 'localhost', '127.0.0.1'],
      port: 5173,
      hmr: isVercel
          ? false
          : {
            host: 'conjectural-unconcealingly-edmund.ngrok-free.dev',
            protocol: 'wss',
            clientPort: 443,
          },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }

  if (useHttpsLocally) {
    baseConfig.server!.https = {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  }

  return baseConfig
})
