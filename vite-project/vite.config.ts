import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import fs from 'fs'

export default defineConfig(({ command, mode }) => {
  // На Vercel мы не используем локальные сертификаты
  const isVercel = process.env.VERCEL === '1';
  const hasCert = !isVercel && fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem');

  return {
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    server: {
      // Разрешаем хосты только для локальной разработки
      allowedHosts: ['.ngrok-free.app', 'localhost', '127.0.0.1'],

      https: hasCert ? {
        key: fs.readFileSync('./localhost-key.pem'),
        cert: fs.readFileSync('./localhost.pem'),
      } : false,

      port: 5173,

      // HMR для ngrok оставляем только если мы НЕ на Vercel
      // На Vercel (в build mode) этот блок вообще не используется
      hmr: isVercel ? false : {
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
})
