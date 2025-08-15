// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const sharedPlugins = [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]

export default [
  // Main action entry point
  {
    input: 'src/index.ts',
    output: {
      esModule: true,
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: sharedPlugins
  },
  // Apply-labels sub-action entry point
  {
    input: 'src/apply-labels.ts',
    output: {
      esModule: true,
      file: 'dist/apply-labels.js',
      format: 'es',
      sourcemap: true
    },
    plugins: sharedPlugins
  },
  // Engagement-score sub-action entry point
  {
    input: 'src/engagement-score.ts',
    output: {
      esModule: true,
      file: 'dist/engagement-score.js',
      format: 'es',
      sourcemap: true
    },
    plugins: sharedPlugins
  }
]
