import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `base` se lee de VITE_BASE para poder desplegar en GitHub Pages (subruta)
// o en Cloudflare Pages (raíz, VITE_BASE=/).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const base = env.VITE_BASE || '/trainup-checkin-prototype/'

  return {
    base,
    // `npm run dev:https` (mode=https) sirve con un certificado autofirmado
    // para poder probar la cámara desde un celular en la red local.
    plugins: [vue(), ...(mode === 'https' ? [basicSsl()] : [])],
    server: {
      host: mode === 'https' ? true : undefined,
      // Permite abrir el dev server a través de `cloudflared tunnel --url ...`.
      allowedHosts: ['.trycloudflare.com'],
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.js'],
    },
  }
})
