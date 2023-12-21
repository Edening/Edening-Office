<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
watch(user, async () => {
  if (user.value) {
    // return navigateTo('/')
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', user.value.id)

    if(data && data.length == 1) {
      navigateTo('/org')
    } else {
      navigateTo('/profile')
    }

    if(error) {
      alert(error?.message)
    }
  }
}, { immediate: true })
</script>
<template>
  <div>Waiting for login...</div>
</template>