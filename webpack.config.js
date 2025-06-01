import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polyfill process in global scope to avoid resolution issues
globalThis.process = globalThis.process || { env: {} };

export default {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    assetModuleFilename: 'assets/[name][ext]',
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    open: true,
    port: 8081,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(mp3|wav)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.mjs', '.json', '.wasm'], // Add more extensions
    fallback: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      util: 'util',
      process: 'process',
      https: 'https-browserify',
      http: 'stream-http',
      url: 'url',
      os: 'os-browserify/browser',
      assert: 'assert',
      path: 'path-browserify',
      zlib: 'browserify-zlib',
      querystring: 'querystring-es3',
      crypto: 'crypto-browserify',
      fs: false,
      net: false,
      tls: false,
      child_process: false
    }
  },
  plugins: [
    new NodePolyfillPlugin({
      // Enable process and Buffer polyfills
      includeAliases: ['process', 'buffer']
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG || ''),
      'global': 'window'
    }),
  ],
  mode: 'development',
};