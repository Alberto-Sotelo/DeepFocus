import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/DeepFocus/', // <-- Línea CRUCIAL: el nombre de tu repositorio
  server: { host: true },
});
