"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.corsOptions = void 0;

var _express = _interopRequireDefault(require("express"));

var _http = _interopRequireDefault(require("http"));

var _cors = _interopRequireDefault(require("cors"));

var _helmet = _interopRequireDefault(require("helmet"));

var _socket = require("./socket");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// Main variables
var corsOptions = {
  origin: 'http://localhost:8080',
  optionsSuccessStatus: 200
};
exports.corsOptions = corsOptions;
var app = (0, _express["default"])();

var server = _http["default"].Server(app); //Configuration


app.use((0, _cors["default"])({
  origin: 'http://localhost:8080',
  credentials: true
}));
app.use((0, _helmet["default"])()); // Web Sockets Configuration

(0, _socket.initSocket)(server); // Error handler

app.use(function (err, req, res, next) {
  console.log(err);
  res.json('Server Error');
}); // Environment Configuration

var env = process.env;
var IPADDR = env.IP;
var PORT = env.PORT || 5000; // Run App

server.listen(5000, function () {
  return console.log('Server is currently running at port 5000...');
});
server.on('close', function () {
  console.log(' Stopping ...');
});
process.on('SIGINT', function () {
  server.close();
}); //Test export

var _default = app;
exports["default"] = _default;
//# sourceMappingURL=api.js.map