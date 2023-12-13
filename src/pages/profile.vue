<script setup>
const supabase = useSupabaseClient()

const user = useSupabaseUser()

const firstName = ref('')
const lastName = ref('')
const email = ref(user.value.email)

const show_error = ref(null)

const { data, error } = await supabase
  .from('profiles')
  .select()
  .eq('id', user.value.id)

if(data && data.length == 1) {
    firstName.value = data[0].first_name
    lastName.value = data[0].last_name
}

if(error)
    show_error.value = error

const createProfile = async () => {
    const { error } = await supabase
        .from('profiles')
        .insert({ id: user.value.id, first_name: firstName.value, last_name: lastName.value, email: email.value })

    if(error)
        show_error.value = error
    else
        navigateTo('/org')
}

const updateProfile = async () => {
    const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName.value, last_name: lastName.value, email: email.value })
        .eq('id', user.value.id)

    if(error)
        show_error.value = error
    else
        navigateTo('/org')
}

</script>

<template>
    <div class="hero min-h-screen bg-base-200">
        <div>
            <div v-show="show_error" class="alert alert-error">
                <pre>Error: {{ show_error }}</pre>
            </div>
            <div class="alert alert-info">
                <p><b>Here is your profile :)</b></p>
            </div>
            <br/>
            <div class="join">
                <label class="btn btn-info join-item">First Name: </label>
                <input v-model="firstName" placeholder="First Name" class="input input-bordered input-info join-item"/>
            </div>
            <br/>
            <br/>
            <div class="join">
                <label class="btn btn-info join-item">Last Name: </label>
                <input v-model="lastName" placeholder="Last Name" class="input input-bordered input-info join-item"/>
            </div>
            <br/>
            <br/>
            <div class="join">
                <label class="btn btn-info join-item">Email: </label>
                <input v-model="email" placeholder="Email" class="input input-bordered input-info join-item" readonly/>
            </div>
            <br/>
            <br/>
            <button v-if="data.length == 1" @click="updateProfile" class="btn btn-info">Update</button>
            <button v-else-if="data.length == 0" @click="createProfile" class="btn btn-info">Create</button>
        </div>
    </div>
</template>