<script setup>
const supabase = useSupabaseClient()

const new_password = ref('')

const show_error = ref('')

const updatePwd = async () => {
    const { data, error } = await supabase.auth.updateUser({
        password: new_password.value
        })

    if(error)
        show_error.value = error
    else
        navigateTo('/')
}

</script>

<template>
    <div class="hero min-h-screen bg-base-200">
        <div>
            <div v-show="show_error" class="alert alert-error">
                <pre>Error: {{ show_error }}</pre>
            </div>
            <div>
                <p><b>New Password:</b></p>
            </div>
            <br/>
            <div class="join">
                <input v-model="new_password" type="password" placeholder="Your New Password" class="input input-bordered input-info join-item"/>
            </div>
            <br/>
            <br/>
            <button @click="updatePwd" class="btn btn-info" style="width: 100%;">Update Password</button>
        </div>
    </div>
</template>