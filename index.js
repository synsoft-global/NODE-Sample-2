var express = require("express");
var app = express(); // define our app using express
var bodyParser = require("body-parser");
var ejs = require("ejs").renderFile;
const http = require("http").Server(app);
const socketio = require("socket.io")(http, { wsEngine: "ws" });
var env = "dev";
var routes = require("./routes")(env);
var path = require("path");
var models = require("./models/index")(env);
var socketserver = require("./socketserver/socketserver");
var Cron = require("./controllers/Cron")(env);
var globals = require("./global");
var rbmq = require("./socketserver/rabbitmq.js")(models);
var cluster = require("cluster");
var cpuCount = require("os").cpus().length;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine("html", ejs);
app.set("view engine", "html");

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, Content-Length, Authorization, Accept, X-Requested-With"
  );
  next();
});

global.UsersData = {};

app.get("/", (req, res) => {
  let data = {};
  data.statuscode = globals.OK;
  data.message = "apis are working";
  res.send(data);
  // res.sendFile(path.join(__dirname, './index.html'));
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/ArchieFolder", express.static(__dirname + "/ArchieFolder"));
var port = process.env.PORT || 8080; // for staging server port is 1337

app.use("/account", routes.account);
socketserver(app, http, socketio, models);

if (cluster.isMaster) {
  // If main thread (MAster process)
  Cron.execute();
  rbmq.do_consume("insert_update");
  rbmq.do_consume_update("update");
  rbmq.do_consume_archieve("archieve_bet");

  console.log(`Master process ${process.pid} running`);
  for (var i = 0; i <= cpuCount; i++) {
    cluster.fork(); // This call the same file
  }
  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // If worker thread
  http.listen(port, function () {
    console.log(`Child ${process.pid} running`);
    console.log("listening on *:8000", port);
  });
}
