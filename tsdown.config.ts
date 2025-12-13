import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',
  dts: true,
  unbundle: true,
  sourcemap: false,
  treeshake: false,
  exports: true,
})
