<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import DemoFooter from '../components/DemoFooter.vue'
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col">
    <main class="safe-top flex flex-1 flex-col px-4 pt-10">
      <div class="flex items-center gap-3">
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-accent text-black">
          <AppIcon name="qr" :size="28" />
        </span>
        <div>
          <p class="font-heading text-2xl font-extrabold leading-none text-white">
            Train<span class="text-brand-accent">UP</span>
          </p>
          <p class="text-sm text-gray-400">Check-in con QR · prototipo</p>
        </div>
      </div>

      <h1 class="mt-10 text-3xl font-extrabold leading-tight text-white">¿Cómo quieres entrar?</h1>
      <p class="mt-2 text-gray-400">Elige un rol para probar la demo. No hace falta iniciar sesión.</p>

      <div class="mt-8 space-y-3">
        <RouterLink :to="{ name: 'client' }" class="card flex items-center gap-4 transition hover:border-brand-accent">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
            <AppIcon name="user" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-heading text-lg font-bold text-white">Soy cliente</span>
            <span class="block text-sm text-gray-400">Muestro mi QR en la entrada</span>
          </span>
          <AppIcon name="back" class="rotate-180 text-gray-500" />
        </RouterLink>

        <RouterLink :to="{ name: 'admin' }" class="card flex items-center gap-4 transition hover:border-brand-accent">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
            <AppIcon name="scan" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-heading text-lg font-bold text-white">Soy admin</span>
            <span class="block text-sm text-gray-400">Escaneo los QR y registro ingresos</span>
          </span>
          <AppIcon name="back" class="rotate-180 text-gray-500" />
        </RouterLink>
      </div>

      <RouterLink :to="{ name: 'settings' }" class="btn-ghost mt-6 self-center text-sm">
        <AppIcon name="cog" :size="18" /> Ajustes y casos de prueba
      </RouterLink>
    </main>

    <DemoFooter />
  </div>
</template>
