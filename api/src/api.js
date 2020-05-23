// Main variables
import express from 'express'
import http from 'http'

import cors from 'cors'
import helmet from 'helmet'
import { initSocket } from './socket'

const origin = process.env.NODE_ENV === 'production' ? 'https://youthful-mahavira-1694db.netlify.app' : 'http://localhost:8080'
console.log(origin)

const app = express()
const server = http.Server(app)

//Configuration
app.use(cors({ origin, credentials: true }))
app.use(helmet())

// Web Sockets Configuration
initSocket(server, origin)

// Error handler
app.use(function (err, req, res, next) {
  console.log(err)
  res.json('Server Error')
})

// Environment Configuration
const env = process.env
const IPADDR = env.IP

// Run App
server.listen(process.env.PORT || 5000, () =>
  console.log('Server is currently running at port' + (process.env.PORT || 5000))
)

server.on('close', function() {
  console.log(' Stopping ...')
})

process.on('SIGINT', function() {
  server.close()
})

//Test export
export default app