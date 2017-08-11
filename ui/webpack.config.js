/*
    ./webpack.config.js
*/
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
      template: './client/index.html',
      filename: 'index.html',
      inject: 'body'
})

module.exports = {
  entry: './client/index.js',
  output: {
    path: path.resolve('dist'),
    filename: 'index_bundle.js'
  },
  resolve: {
    modules: [
        path.resolve('node_modules'),
        path.resolve('client/components'),
        path.resolve('client/css')
    ]
  },

  module: {
    loaders: [
      { test: /\.css$/, use: [ { loader: 'style-loader', options: {
          fixUrls: true,
          sourceMap: true,
          convertToAbsoluteUrls: true
      }}, { loader: 'css-loader', options: {
          sourceMap: true,
          url: false
      }} ]},
      { test: /\.(eot|svg|ttf|woff|woff2)$/, loader: 'file-loader?name=public/fonts/[name].[ext]' },
      { test: /\.js$/,  loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\.jsx$/, loader: 'babel-loader', exclude: /node_modules/ }
    ]
  },
  plugins: [HtmlWebpackPluginConfig]
}

