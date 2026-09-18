import { defineConfig } from 'vite'

// 相对路径 base：兼容 GitHub Pages 项目子路径（/kinship-nomenclature/）与本地 dev
export default defineConfig({
  base: './',
})
