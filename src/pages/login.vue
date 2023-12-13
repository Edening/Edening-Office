<script setup lang="ts">
import { MagicLink, Auth, ThemeBold, type Appereance, css } from 'vue-auth-ui'

const loading = ref(false)

const supabase = useSupabaseClient()

const user = useSupabaseUser()

const router = useRouter()

const appearance: Appereance = {
  theme: ThemeBold,
  themeVariant: 'light',
  // In addition to theme and variant you can specify other preferences.
  // More on that in the "customization" section.
  prependedClassName: 'my-custom-class',
  className: {
    button: css({
      variants: {
        color: {
          primary: {
            backgroundColor: 'dark'
          }
        }
      }
    })
  }
}

const message = ref('')

const show_error = ref('')

const signIn = async (creds: any) => {
  loading.value = true

  const { data, error } = await supabase.auth.signInWithPassword(creds)

  loading.value = false

  if(error)
    show_error.value = error?.message
  else if(data.user && user.value) {
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', user.value.id)

    if(data && data.length == 1) {
      navigateTo('/org')
    } else {
      navigateTo('/profile')
    }

    if(error)
      show_error.value = error?.message
  }
}

const signUp = async (creds: any) => {
  loading.value = true

  const { data, error } = await supabase.auth.signUp(creds)

  loading.value = false

  if(error)
    show_error.value = error?.message
  else {
    // navigateTo('/profile')
    // router.push('/login')
    signIn(creds)
  }
}

const resetPwd = async (email: any) => {
  loading.value = true

  const { data, error } = await supabase.auth.resetPasswordForEmail(email.email.value, {
    redirectTo: 'http://localhost:3000/update-password',
    // redirectTo: 'http://localhost:3000/api/auth/callback?next=/update-password',
  })

  loading.value = false

  if(error)
    show_error.value = error?.message
  else
    message.value = 'Please check your email for instruction!'
}

const signInWithOtp = async (email: {[key: string]: any}) => {
  loading.value = true

  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.email.value,
    options: {
      emailRedirectTo: 'http://localhost:3000/confirm',
    }
  })

  loading.value = false

  if(error)
    show_error.value = error?.message

  if(data.user)
    message.value = data.user.email + ' logged in.'

  // ...
}
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div>
      <span v-if="loading" class="loading loading-spinner text-info"></span>
      <div v-show="show_error != ''" class="alert alert-error">
        <pre>Error: {{ show_error }}</pre>
      </div>
      <!-- <Auth
        :providers="['google', 'apple']"
        socialLayout="col"
        :appearance="appearance"
        :error="show_error"
        :message="message"
        @signInWithPassword="creds => signIn(creds)"
        @signUp="creds => signUp(creds)"
        @signInWithOAuth="provider => supabase.auth.signInWithOAuth(provider)"
        :magicLink="false"
        @signInWithOtp="signInWithOtp"
      /> -->
      <Auth
        :appearance="appearance"
        :error="show_error"
        :message="message"
        @signInWithPassword="creds => signIn(creds)"
        @signUp="creds => signUp(creds)"
        @resetPasswordForEmail="email => resetPwd(email)"
        :magicLink="false"
      />
    </div>
  </div>
</template>