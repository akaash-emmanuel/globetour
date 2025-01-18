import path from 'path';
import { fileURLToPath } from 'url';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'; // Add this line

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    port: 8080,
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
    extensions: ['.js'], // Add this to resolve .js files without specifying the extension
  },
  plugins: [
    new NodePolyfillPlugin(), // Add this line to polyfill Node.js modules
  ],
  mode: 'development',
};