<script setup>
// Íconos de trazo (24×24) embebidos, para no depender de una librería.
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
  stroke: { type: [Number, String], default: 2 },
})

const PATHS = {
  check: ['M4.5 12.75l6 6 9-13.5'],
  x: ['M6 18L18 6', 'M6 6l12 12'],
  clock: ['M12 6v6l4 2', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  back: ['M15.75 19.5L8.25 12l7.5-7.5'],
  bolt: ['M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z'],
  switch: ['M16 3h5v5', 'M21 3l-6.5 6.5', 'M8 21H3v-5', 'M3 21l6.5-6.5'],
  search: ['M21 21l-5.2-5.2', 'M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z'],
  list: ['M8.25 6.75h12', 'M8.25 12h12', 'M8.25 17.25h12', 'M3.75 6.75h.01', 'M3.75 12h.01', 'M3.75 17.25h.01'],
  qr: [
    'M3.75 3.75h6v6h-6z',
    'M14.25 3.75h6v6h-6z',
    'M3.75 14.25h6v6h-6z',
    'M14.25 14.25h2.25v2.25h-2.25z',
    'M18 18h2.25v2.25H18z',
    'M14.25 18h1.5',
    'M18 14.25h2.25',
  ],
  scan: ['M3.75 7.5V4.5a.75.75 0 01.75-.75h3', 'M16.5 3.75h3a.75.75 0 01.75.75v3', 'M20.25 16.5v3a.75.75 0 01-.75.75h-3', 'M7.5 20.25h-3a.75.75 0 01-.75-.75v-3', 'M3.75 12h16.5'],
  download: ['M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5', 'M7.5 12L12 16.5 16.5 12', 'M12 3v13.5'],
  cog: [
    'M10.3 4.3c.4-1.7 3-1.7 3.4 0a1.7 1.7 0 002.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 001 2.5c1.8.5 1.8 3 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.5-1c-1.6.9-3.3-.9-2.4-2.4a1.7 1.7 0 00-1.1-2.6c-1.7-.4-1.7-2.9 0-3.4a1.7 1.7 0 001.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 002.5-1.1z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  user: ['M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z', 'M4.5 20.1a7.5 7.5 0 0115 0'],
  shield: ['M12 3l7.5 3v5.25c0 4.6-3.2 8.6-7.5 9.75-4.3-1.15-7.5-5.15-7.5-9.75V6L12 3z', 'M9 12l2 2 4-4'],
  refresh: ['M16 4h4v4', 'M20 4l-3.1 3.1A7.5 7.5 0 104.5 12'],
  alert: ['M12 9v3.75', 'M12 15.75h.01', 'M10.3 3.9L2.4 17.6A1.9 1.9 0 004 20.4h16a1.9 1.9 0 001.6-2.8L13.7 3.9a1.9 1.9 0 00-3.4 0z'],
  hand: ['M12 3v9', 'M8.25 6v7.5', 'M15.75 5.25V12', 'M19.5 9v4.5a7.5 7.5 0 01-15 0V9'],
}

const paths = (name) => PATHS[name] ?? []
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    :width="size"
    :height="size"
    aria-hidden="true"
  >
    <path v-for="(d, i) in paths(name)" :key="i" :d="d" />
  </svg>
</template>
