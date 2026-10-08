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
const clients = ref([])
const gymId = ref(null)
const userId = ref(null)
const loadingClients = ref(false)

onMounted(async () => {
  gyms.value = await listGyms()
  gymId.value = gyms.value[0]?.id ?? null
})

watch(gymId, async (id) => {
  userId.value = null
  clients.value = []
  if (!id) return
  loadingClients.value = true
  clients.value = await listDemoUsers({ gymId: id, role: 'client' })
  loadingClients.value = false
})

const gymOptions = computed(() => gyms.value.map((g) => ({ value: g.id, title: g.name, subtitle: g.slug })))
const clientOptions = computed(() =>
  clients.value.map((u) => ({
    value: u.id,
    title: u.name,
    subtitle: u.email,
    badge: u.membership_status === 'active' ? u.classification : 'Desactivado',
  })),
)

function generate() {
  router.push({ name: 'client-pass', params: { userId: userId.value } })
}
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md">
    <PageHeader title="Soy cliente" subtitle="Elige quién eres en la demo" :back="{ name: 'home' }" />

    <main class="space-y-4 px-4">
      <div class="card">
        <OptionList v-model="gymId" :options="gymOptions" name="gym" legend="Gimnasio" />
      </div>

      <div class="card">
        <p v-if="loadingClients" class="text-sm text-gray-400">Cargando clientes…</p>
        <OptionList v-else v-model="userId" :options="clientOptions" name="client" legend="Cliente de demo" />
      </div>

      <button type="button" class="btn-primary w-full text-lg" :disabled="!userId" @click="generate">
        <AppIcon name="qr" /> Generar mi QR
      </button>
    </main>

    <DemoFooter />
  </div>
</template>
