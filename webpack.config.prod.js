const path = require('path');
const webpack = require('webpack');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  target: 'node',
  context: path.join(__dirname, './src'),
  entry: {
    app: './app.js',
    popup: './popup.js',
    background: './background.js',
    result: './result.js'
  },
  output: {
    path: path.join(__dirname, './build/unpacked'),
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
  resolve: {
    extensions: ['', '.js']
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      comments: false
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ]
}
