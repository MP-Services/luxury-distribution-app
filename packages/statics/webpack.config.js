const path = require('path');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const isProduction = process.env.NODE_ENV === 'production';
const environmentPath = !process.env.ENVIRONMENT ? '.env' : `.env.${process.env.ENVIRONMENT}`;

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: ['./src/js/index.js'],
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'js/authentication.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: {
          loader: 'css-to-string-loader!css-loader'
        }
      },
      {
        test: /\.svg$/,
        use: {
          loader: 'svg-url-loader',
          options: {
            limit: 10000
          }
        }
      }
    ]
  },
  stats: {
    colors: true
  },
  devtool: 'eval-source-map',
  plugins: [
    new FileManagerPlugin({
      onEnd: {
        copy: [
          {
            source: path.resolve(__dirname, './dist/'),
            destination: path.resolve(__dirname, '../../static/login')
          }
        ]
      }
    }),
    new Dotenv({
      safe: false,
      defaults: '.env.example',
      systemvars: true,
      path: path.resolve(__dirname, environmentPath)
    })
  ]
};
