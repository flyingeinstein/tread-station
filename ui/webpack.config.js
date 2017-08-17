/*
    ./webpack.config.js
*/
const path = require('path');
//const merge = require('merge');

var TARGET = process.env.npm_lifecycle_event;

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
      template: './client/index.html',
      filename: 'index.html',
      inject: 'body'
})

module.exports = {
  entry: './client/index.js',
  devtool: "#cheap-module-eval-source-map",
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
      { test: /\.jsx?$/, loader: 'babel-loader', exclude: /node_modules/, query: { presets: ['env','react'], retainLines: true } },
      { test: /\.css$/, use: [ { loader: 'style-loader', options: {
          fixUrls: true,
          sourceMap: true,
          convertToAbsoluteUrls: true
      }}, { loader: 'css-loader', options: {
          sourceMap: true,
          url: false
      }}, //{ loader: 'source-map-loader' }
      ]},
      { test: /\.(eot|svg|ttf|woff|woff2)$/, loader: 'file-loader?name=public/fonts/[name].[ext]' }
    ]
  },
  plugins: [HtmlWebpackPluginConfig]
};

/*const productionConfig = merge([

    parts.generateSourceMaps({ type: 'source-map' })
]);

const debugConfig = merge([
    {
        output: {
            devtoolModuleFilenameTemplate: 'webpack:///[absolute-resource-path]',
        },
    },
    parts.generateSourceMaps({ type: 'cheap-module-eval-source-map' })
]);*/

