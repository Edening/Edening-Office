<template>
  <div :data-theme="theme">
    <div class="navbar fixed bg-base-100 z-40 shadow-sm">
      <div class="navbar-start">
        <a class="btn btn-ghost md:text-xl" href="/">Office@Edening</a>
      </div>
      <div class="navbar-center hidden lg:flex">
        <!-- TODO: You can add menu here -->
        <a href="https://github.com/Edening/Edening-Office" target="_blank">
          <img src="/images/github-svgrepo-1.svg" style="width: 24px; height: 24px;"/>
        </a>
        <!-- &nbsp;
        |
        &nbsp;
        <a href="/pricing">Pricing(Sample)</a> -->
      </div>
      <div class="navbar-end">
        <!-- <select v-model="theme" class="select select-primary md:w-full md:max-w-xs">
          <option disabled selected>Select Theme</option>
          <option v-for="theme in themes" :value="theme" :key="theme">
            <span class="uppercase">{{ theme }}</span>
          </option>
        </select> -->
        <a v-if="!user" href="/login" class="btn btn-ghost md:text-xl">SignIn</a>
        <a v-else @click="signOut" class="btn btn-ghost md:text-xl">SignOut</a>
      </div>
    </div>
    <slot />
    <!-- <footer class="footer footer-center p-10 bg-base-50">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold">Nuxtwind Daisy</h1>
        <p class="md:font-bold">
          Create beautiful and fast websites without the tedious setup
        </p>
        <p>Copyright © {{new Date().getFullYear()}} - All right reserved</p>
      </div>
      <div>
        <div class="grid grid-flow-col gap-4">
          <a href="https://twitter.com/jrtiquez" target="_blank">
            <i class="lab la-twitter text-4xl"></i>
          </a>
          <a href="https://github.com/ossphilippines/nuxtwind-daisy" target="_blank">
            <i class="lab la-github text-4xl"></i>
          </a>
          <a href="https://facebook.com/ossph.org" target="_blank">
            <i class="lab la-facebook text-4xl"></i>
          </a>
        </div>
      </div>
    </footer> -->
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
const THEMES = [
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
];

export default {
  setup () {

    const supabase = useSupabaseClient()

    const router = useRouter()

    const signOut = async () => {
      const { error } = await supabase.auth.signOut()
      if(error) {
        console.log(error)
      } else {
        user.value = null
        router.push('/')
      }
    }

    const theme = ref(null);
    // const user = ref(null);

    const user = useSupabaseUser()

    watch(theme, (value) => {
      localStorage.setItem('daisyui-theme', value);
    });
    onMounted(async () => {
      theme.value = localStorage.getItem('daisyui-theme') || 'cupcake';
    });
    return {
      theme,
      themes: THEMES,
      user,
      signOut,
    };
  },
};
</script>
