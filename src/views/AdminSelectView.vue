<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import DemoFooter from '../components/DemoFooter.vue'
import OptionList from '../components/OptionList.vue'
import PageHeader from '../components/PageHeader.vue'
import { listDemoUsers, listGyms } from '../api/mockApi.js'

const router = useRouter()
const gyms = ref([])
const admins = ref([])
const gymId = ref(null)
const adminId = ref(null)

onMounted(async () => {
  gyms.value = await listGyms()
  gymId.value = gyms.value[0]?.id ?? null
})

watch(gymId, async (id) => {
  adminId.value = null
  admins.value = id ? await listDemoUsers({ gymId: id, role: 'admin' }) : []
  // Cada gimnasio de demo tiene un solo admin: lo dejamos elegido.
  if (admins.value.length === 1) adminId.value = admins.value[0].id
})

const gymOptions = computed(() => gyms.value.map((g) => ({ value: g.id, title: g.name, subtitle: g.slug })))
const adminOptions = computed(() => admins.value.map((u) => ({ value: u.id, title: u.name, subtitle: u.email })))

function open() {
  router.push({ name: 'admin-scanner', params: { adminId: adminId.value } })
}
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md">
    <PageHeader title="Soy admin" subtitle="Elige el gimnasio donde vas a escanear" :back="{ name: 'home' }" />

    <main class="space-y-4 px-4">
      <div class="card">
        <OptionList v-model="gymId" :options="gymOptions" name="gym" legend="Gimnasio" />
      </div>

      <div class="card">
        <OptionList v-model="adminId" :options="adminOptions" name="admin" legend="Admin de demo" />
      </div>

      <button type="button" class="btn-primary w-full text-lg" :disabled="!adminId" @click="open">
        <AppIcon name="scan" /> Abrir escáner
      </button>
    </main>

    <DemoFooter />
  </div>
</template>
