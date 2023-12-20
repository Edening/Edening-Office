// const LANG = 'en_US';
// const TYPE = 'website';
// const URL = 'https://hippocrades.com';
// const SITE_NAME = 'hippocrades.com';

// https://nuxt.com/docs/api/configuration/nuxt-config
// eslint-disable-next-line no-undef
export default defineNuxtConfig({
  // vite: {
  //   resolve: {
  //     dedupe: ['vue']
  //   }
  // },

  supabase: {
    redirectOptions: {
      exclude: ['/', '/org', '/org/*', '/update-password', '/pricing'],
    }
  },

  css: ['animate.css/animate.min.css'],

  preset: 'node-server',

  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-headlessui',
    'nuxt-gtag',
    '@nuxtjs/supabase',
    '@varlet/nuxt',
  ],

  gtag: {
    id: 'G-M1KERXTK1H', // TODO: Add your google analytics 4 tag here
  },

  srcDir: './src',

  runtimeConfig: {
    public: {
      signaling: process.env.SIGNALING,
    },
  },

  plugins: [
    {
      src: '@/plugins/aos',
      ssr: false,
      mode: 'client',
    },
  ],

  app: {
    head: {
      title: 'Edening Office 💨',
      description: 'Achieving the fragile balance between creativity and freedom...',
      link: [
        {
          rel: 'stylesheet',
          href: 'https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css',
        },
        {rel: 'icon', type: "image/png", href: '/favicon.png'},
      ],
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config',
    exposeConfig: false,
    exposeLevel: 2,
    config: {},
    injectPosition: 'first',
    viewer: true,
  },

  headlessui: {
    prefix: 'Headless',
  },

  build: {
    extend (config, ctx) {
      config.resolve.symlinks = false;
    },
  },

  image: {
    dir: 'assets/images',
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
      '2xl': 1536,
      '3xl': 1920,
    },
  },

  devtools: {
    enabled: true,
  },
});
