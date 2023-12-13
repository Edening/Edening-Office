<script setup>
const loading = ref(false)

const supabase = useSupabaseClient()

const user = useSupabaseUser()

const show_error = ref(null)

const organizations = ref([])
const orgName = ref('')

const fetchOrganizations = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('organizations')
    .select()

  loading.value = false

  organizations.value = data

  if(error)
    show_error.value = error
}

const searchByOrgName = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('organizations')
    .select()
    .ilike('name', '%' + orgName.value + '%')
  
  loading.value = false

  organizations.value = data

  if(error)
    show_error.value = error
}

onMounted(() => {
  fetchOrganizations()
})

</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div style="width: 56rem;">
      <span v-if="loading" class="loading loading-spinner text-info"></span>
      <div v-show="show_error" class="alert alert-error">
        <pre>Error: {{ show_error }}</pre>
      </div>
      <div class="join">
        <input @input="searchByOrgName" v-model="orgName" class="input input-bordered input-info join-item" placeholder="Search Organization"/>
        <a v-if="organizations.length == 0 && user" :href="'/org/' + orgName" class="btn join-item btn-info rounded-r-full">Own</a>
      </div>
      <br/>
      <br/>
      <div class="grid grid-cols-3 gap-3">
        <div v-for="org in organizations" class="card w-72 bg-base-100 shadow-xl image-full">
          <figure><img src="/images/office.png" alt="Office" /></figure>
          <div class="card-body">
            <h2 class="card-title">{{ org.name }}</h2>
            <p>{{ org.full_name }}</p>
            <div class="card-actions justify-end">
              <a class="btn btn-primary" :href="'/org/' + org.name" target="_blank">Enter</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
