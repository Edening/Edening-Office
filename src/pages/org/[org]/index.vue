<script setup>
const loading = ref(false)

const supabase = useSupabaseClient()

const user = useSupabaseUser()

const route = useRoute()

const orgID = ref('')
const orgName = ref(route.params.org)
const orgFullName = ref('')
const orgOwner = ref('')

const show_error = ref(null)

loading.value = true

  const { data, error } = await supabase
    .from('organizations')
    .select()
    .eq('name', orgName.value)

  loading.value = false

  if(data && data.length == 1) {
    orgID.value = data[0].id
    orgFullName.value = data[0].full_name
    orgOwner.value = data[0].owner
  }

  if(error)
      show_error.value = error

const ownOrg = async () => {
  loading.value = true

    const { error } = await supabase
        .from('organizations')
        .insert({ owner: user.value.id, name: orgName.value, full_name: orgFullName.value })

  loading.value = false

    if(error)
        show_error.value = error
    else {
      loading.value = true

      const { data, error } = await supabase
        .from('organizations')
        .select()
        .eq('name', orgName.value)

      loading.value = false

      if(data && data.length == 1) {
        orgID.value = data[0].id
        orgFullName.value = data[0].full_name
        orgOwner.value = data[0].owner
      }

      if(error)
          show_error.value = error

      if(orgID.value != '')
        fetchSpaces
    }
  
  return
}

const updateOrg = async () => {
  loading.value = true

    const { error } = await supabase
        .from('organizations')
        .update({ full_name: orgFullName.value })
        .eq('id', orgID.value)
  
  loading.value = false

    if(error)
        show_error.value = error
}

const spaces = ref([])
const spaceName = ref('')
const spaceType = ref('Office')

const fetchSpaces = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('spaces')
    .select()
    .eq('org', orgID.value)

  loading.value = false

  spaces.value = data

  if(error)
    show_error.value = error
}

onMounted(() => {
  if (orgID.value != '') {
    fetchSpaces()
  }
})

const createSpace = async () => {
  loading.value = true

  const { error } = await supabase
    .from('spaces')
    .insert({ org: orgID.value, name: spaceName.value, type: spaceType.value })

  loading.value = false

  if(error)
    show_error.value = error

  fetchSpaces()
}

</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div style="width: 56rem;">
      <span v-if="loading" class="loading loading-spinner text-info"></span>
      <div v-show="show_error" class="alert alert-error">
        <pre>Error: {{ show_error }}</pre>
      </div>
      <div class="alert alert-info">
        <p><b>Organization[{{ $route.params.org }}]</b></p>
      </div>
      <br/>
      <div class="join">
        <label class="btn btn-info join-item">Name: </label>
        <input v-model="orgName" placeholder="Name" class="input input-bordered input-info join-item" readonly/>
      </div>
      <br/>
      <br/>
      <div class="join">
        <label class="btn btn-info join-item">Full Name: </label>
        <input v-if="orgID == '' || (orgID != '' && user && user.id == orgOwner)" v-model="orgFullName" placeholder="Full Name" class="input input-bordered input-info join-item"/>
        <input v-else v-model="orgFullName" placeholder="Full Name" class="input input-bordered input-info join-item" readonly/>
      </div>
      <br/>
      <br/>
      <button v-if="orgID != '' && user && user.id == orgOwner" @click="updateOrg" class="btn btn-sm md:btn-md btn-primary">Update</button>
      <button v-else-if="orgID == '' && user " @click="ownOrg" class="btn btn-sm md:btn-md btn-primary">Own</button>

      <div v-if="orgID != ''">
        <div class="divider">Spaces</div>

        <div v-if="user && user.id == orgOwner" class="join">
          <input v-model="spaceName" class="input input-bordered input-info join-item" placeholder="Space Name"/>
          <select v-model="spaceType" class="select select-bordered select-info join-item">
            <option selected>Office</option>
            <option>Meeting</option>
          </select>
          <button @click="createSpace" class="btn join-item btn-info rounded-r-full">Create</button>
        </div>

        <br/>
        <br/>

        <div class="grid grid-cols-3 gap-3">
        <div v-for="space in spaces" class="card w-72 bg-base-100 shadow-xl image-full">
          <figure>
            <img v-if="space.type == 'Office'" src="/images/office.png" alt="Office" />
            <img v-else-if="space.type == 'Meeting'" src="/images/meeting.png" alt="Office" />
          </figure>
          <div class="card-body">
            <h2 class="card-title">{{ space.name }}</h2>
            <div class="card-actions justify-end">
              <a class="btn btn-primary" :href="'/org/' + orgName + '/' + space.name" target="_blank">Enter</a>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>
