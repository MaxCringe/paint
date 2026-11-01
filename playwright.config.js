import {defineConfig} from '@playwright/test';

// Chromium uses software WebGL in CI to cover startup and Fiona's real FBX
// loader without requiring the runner to have a dedicated graphics card.
export default defineConfig({
 testDir:'./tests/browser',
 timeout:120_000,
 expect:{timeout:20_000},
 retries:0,
 workers:1,
 reporter:'list',
 use:{
  baseURL:'http://127.0.0.1:4173',
  viewport:{width:1280,height:720},
  browserName:'chromium',
  headless:true,
  launchOptions:{args:[
   '--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',
   '--disable-dev-shm-usage'
  ]}
 },
 webServer:{
  command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
  url:'http://127.0.0.1:4173',
  reuseExistingServer:!process.env.CI,
  timeout:35_000
 }
});
