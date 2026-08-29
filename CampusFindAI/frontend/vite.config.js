import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CampusFind AI frontend
// Dev server is fixed to port 5173 to match the backend's CORS policy
// (see backend/Extensions/ServiceExtensions.cs -> AddCorsPolicy, which only
// allows http://localhost:5173).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
