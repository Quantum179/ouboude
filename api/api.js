// Main variables
import express from 'express'
import http from 'http'

import { getStatusText } from 'http-status-codes'
import cors from 'cors'
import bodyParser from 'body-parser'
import helmet from 'helmet'
import {initSocket} from './socket'
import router from './router'

export const corsOptions = {
  origin: 'http://localhost:8080',
  optionsSuccessStatus: 200
}

const app = express()
const server = http.Server(app)

//Configuration
app.use(cors({ origin: 'http://localhost:8080', credentials: true }))
app.use(helmet())
app.use((req, res, next) => {
  sanitizer.escape(req)
  next()
})

// Web Sockets Configuration
app.use(initSocket(server))

// Error handler
app.use(function (err, req, res, next) {
  console.log(err)
  res.json('Server Error')
})

// Environment Configuration
const env = process.env
const IPADDR = env.IP
const PORT = env.PORT || 5000

// Run App
server.listen(5000, () =>
  console.log('Server is currently running at port 5000...')
)

server.on('close', function() {
  console.log(' Stopping ...')
})

process.on('SIGINT', function() {
  server.close()
})

//Test export
export default app