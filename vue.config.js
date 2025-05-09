const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: false,
  publicPath: process.env.NODE_ENV === 'production'
    ? '/berio/' // Đảm bảo có dấu / ở cả đầu và cuối
    : '/',
  devServer: {
    https: true,
    host: '0.0.0.0',
    allowedHosts: 'all',
    client: {
      webSocketURL: {
        protocol: 'wss',
        hostname: 'urban-guacamole-r4r6p65667jhpwj9-8080.app.github.dev',
        port: 443,
        pathname: '/ws'
      }
    }
  }
})
