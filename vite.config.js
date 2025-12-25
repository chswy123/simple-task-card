import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile' // 引入插件

export default defineConfig({
  plugins: [
    vue(),
    viteSingleFile() // 添加这个插件
  ],
  base: './', // 必须设置为相对路径
  build: {
    // 这里的配置是为了确保内联效果更好
    assetsInlineLimit: 100000000,
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})