import { defineEventHandler, getQuery, sendRedirect } from 'h3';

export default defineEventHandler(async (event) => {
    // api/auth/callback.ts

    const supabase = useSupabaseClient()

    // The code is retrieved from the query parameter - use whichever mechanism is recommended
    // for your app/framework. This is just an example.
    // const code = url.searchParams.get('code')
    const query = getQuery(event);

    // call the Supabase API to exchange the code for a session
    await supabase.auth.exchangeCodeForSession(query.code)

    // api/auth/callback.ts

    // The password page path is retrieved from the query parameter - use whichever mechanism is recommended
    // for your app/framework. This is just an example.
    // const next = url.searchParams.get('next')
    const next = query.next

    // using Next.js API response object in this example
    // res.redirect(next)
    sendRedirect(event, next)

})
  