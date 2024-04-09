import {defineConfig, transformWithEsbuild} from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import fs from 'fs';
import os from 'os';
import EnvironmentPlugin from 'vite-plugin-environment';
import {nodePolyfills} from 'vite-plugin-node-polyfills';

const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.HOST ? process.env.HOST.replace(/https?:\/\//, '') : 'localhost';
const isEmbed = process.env.IS_EMBEDDED_APP === 'yes';
const templateFile = isEmbed ? 'index.html' : 'standalone.html';
const templateOutFile = isEmbed ? 'embed.html' : 'standalone.html';
const fePort = process.env.FRONTEND_PORT || 5000;
const bePort = process.env.BACKEND_PORT || 5050;

console.log('Template file', templateFile, fePort, bePort);

let hmrConfig;
if (host === 'localhost') {
  hmrConfig = {
    protocol: 'ws',
    host: 'localhost',
    port: 64999,
    clientPort: 64999,
    overlay: true
  };
} else {
  hmrConfig = {
    protocol: 'wss',
    host: host,
    port: fePort,
    clientPort: 443,
    overlay: true
  };
}

const proxyOptions = {
  target: `http://127.0.0.1:${bePort}`,
  changeOrigin: false,
  secure: true,
  ws: false
};

if (!isProduction && process.env.SHOPIFY_API_KEY) {
  try {
    const runtimeFile = '../functions/.runtimeconfig.json';
    fs.readFile(runtimeFile, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }
      const configData = JSON.parse(data);
      configData.app.base_url = process.env.HOST.replace('https://', '');
      configData.shopify.api_key = process.env.SHOPIFY_API_KEY;
      configData.shopify.secret = process.env.SHOPIFY_API_SECRET;
      fs.writeFileSync(runtimeFile, JSON.stringify(configData, null, 4));
    });

    updateEnvFile('.env.development', {
      VITE_SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY
    });
  } catch (e) {
    console.error('Error changing the env file');
  }
}

/**
 *
 * @param file
 * @param data
 */
function updateEnvFile(file, data) {
  const ENV_VARS = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const keys = Object.keys(data);
  for (const key of keys) {
    // find the env we want based on the key
    const target = ENV_VARS.indexOf(ENV_VARS.find(line => line.match(new RegExp(key))));
    const replaceIndex = target === -1 ? ENV_VARS.length - 1 : target;

    // replace the key/value with the new value
    ENV_VARS[replaceIndex] = `${key}=${data[key]}`;
  }

  // write everything back to the file system
  fs.writeFileSync(file, ENV_VARS.join(os.EOL));
}

const proxyConfig = {
  '^/api(/|(\\?.*)?$)': proxyOptions,
  '^/authSa(/|(\\?.*)?$)': proxyOptions,
  '^/auth(/|(\\?.*)?$)': proxyOptions,
  '^/apiSa(/|(\\?.*)?$)': proxyOptions
};

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.IS_EMBEDDED_APP': process.env.IS_EMBEDDED_APP
  },
  plugins: [
    nodePolyfills(),
    // eslint-disable-next-line new-cap
    EnvironmentPlugin(
      {
        IS_EMBEDDED_APP: true,
        SHOPIFY_API_KEY: null,
        HOST: 'localhost',
        FRONTEND_PORT: 5000,
        BACKEND_PORT: 5050,
        NODE_ENV: 'development'
      },
      {
        loadEnvFiles: true
      }
    ),
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null;

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic'
        });
      }
    },
    {
      name: 'index-html-build-replacement',
      async transformIndexHtml(html) {
        if (!isEmbed) {
          return html.replace('embed.js', 'standalone.js');
        }
        return html;
      }
    },
    react({jsxRuntime: 'classic'})
  ],
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      },
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, './src'),
      '@functions': path.resolve(__dirname, '../functions/src')
    }
  },
  server: {
    host: 'localhost',
    port: fePort,
    hmr: hmrConfig,
    proxy: proxyConfig
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    outDir: '../../static',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        app: './' + templateOutFile
      }
    }
  }
});
