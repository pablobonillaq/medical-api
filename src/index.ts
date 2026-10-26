import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.PORT, (error) => {
    if (error) throw error
    console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`)
})