const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production'
    ? '/berio/' // Đảm bảo có dấu / ở cả đầu và cuối
    : '/'
})