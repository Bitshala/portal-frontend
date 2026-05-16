import { defineConfig } from 'unocss'

export default defineConfig({
  theme: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
  },
  safelist: [
    // Score color classes from resultHelper.ts
    'text-emerald-400',
    'text-amber-400',
    'text-red-400',
    // Rank styling classes from resultHelper.ts
    'text-yellow-400',
    'text-gray-200',
    'text-amber-600',
    'text-zinc-400',
    'font-bold',
    'font-semibold',
  ],
})