<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- La key fuerza a recrear la vista si solo cambia el parámetro (/client/101 → /client/103). -->
  <RouterView :key="$route.path" />
</template>
