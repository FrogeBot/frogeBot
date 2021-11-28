require("dotenv").config() // Get .env

const { fetchRecommendedShards } = require("./node_modules/discord.js/src/util/Util.js");
let numShards = fetchRecommendedShards(process.env.TOKEN, { guildsPerShard: process.env.DIST_GUILDS_PER_SHARD });

async function start() {
  const fs = require("fs")
  const path = require("path");
  const YAML = require("yaml");
  const commands = YAML.parse(fs.readFileSync("./commands.yml", "utf8"));
  let commandDescs = {}
  Object.keys(commands).forEach(cmd => {
      if(!commands[cmd].hidden) {
          commandDescs[cmd] = {
              description: commands[cmd].description,
              category: commands[cmd].category
          }
      }
  });

  function gracefulShutdown() { // When the bot is shut down, it does it politely
      process.exit(); // Exit node process
  }

  // e.g. kill
  process.on('SIGTERM', gracefulShutdown);

  // e.g. Ctrl + C
  process.on('SIGINT', gracefulShutdown);

  if(process.env.DIST_WEB_ENABLED == "true") { // If using web
    const express = require('express')
    const session = require('express-session')

    const app = express() // Create express server

    app.use(express.json());
    app.use(session({
      secret: process.env.DIST_WHITELIST[0],
      resave: true,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 60000 }
    }))

    // Set up rate limiter: maximum of 50 requests per minute
    var RateLimit = require('express-rate-limit');
    var limiter = new RateLimit({
        windowMs: 1*60*1000, // 1 minute
        max: 50
    });

    // Apply rate limiter to all requests
    app.use(limiter);

    app.use(express.static("web/public")) // Static hosting of web/public folder
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname,"web/index.html")) // Main page
    })
    app.get('/commands.json', (req, res) => {
        res.send(commandDescs) // Send command descriptions as JSON
    })

    app.get("/images/*", async (req, res) => { // Image hosting
      let imgPath = path.join(__dirname,"web_images/"+req.path.split("/")[2]) // Define supposed path
      if (fs.existsSync(imgPath)) { // If file exists
          const r = fs.createReadStream(imgPath) // Stream image to browser
          r.pipe(res) // Pipe stream
      } else {
          const r = fs.createReadStream("assets/imageExpired.png") // Stream "Image expired" to browser
          r.pipe(res) // Pipe stream
      }
    })
    
    app.get('/admin', (req, res) => {
      if(req.socket.remoteAddress == "::ffff:127.0.0.1") req.session.authed = true;
      if(req.session.authed) {
        res.sendFile(path.join(__dirname,"web/admin/dashboard.html"))
      } else {
        res.redirect('/admin/login')
      }
    })
    let guildCount = 0;
    app.get('/admin/data.json', async (req, res) => {
      if(req.socket.remoteAddress == "::ffff:127.0.0.1") req.session.authed = true;
      if(req.session.authed) {
        let connCount = 0;
        if (conns) connCount = Object.values(conns).reduce((prev, current, idx) => { if(current.connected) { return prev+1 } else { return prev } }, 0)
        res.send({ connCount, shardCount: await numShards })
      } else {
        res.sendStatus(401)
      }
    });
    app.get('/admin/login', (req, res) => {
      if(req.session.authed) {
        res.redirect('/admin')
      } else {
        res.sendFile(path.join(__dirname,"web/admin/login.html"))
      }
    });
    app.post('/admin/login', (req, res) => {
      if(req.body.password == "password") {
        req.session.authed = true;
        res.sendStatus(200)
      } else {
        req.session.authed = false;
        res.sendStatus(401)
      }
    });
    
    async function getShardList(connIdx) {
      let list = [];
      let totalWeight = Object.values(conns).reduce((prev, current) => { return prev.weight + current.weight }, { weight: 0 });
      let shardCountPrior = Object.values(conns).reduce((prev, current, idx) => { if(idx < connIdx) { return prev + Math.round(numShards*(current.weight/totalWeight)) } else { return prev } }, 0);
      console.log(totalWeight);
      console.log(shardCountPrior);
      for(let i = shardCountPrior; i < shardCountPrior + Math.round((await numShards)*(Object.values(conns)[connIdx].weight/totalWeight)); i++) {
        list.push(i);
      }
      return list;
    }

    app.post('/admin/startShards', (req, res) => {
      if(req.socket.remoteAddress == "::ffff:127.0.0.1") req.session.authed = true;
      if(req.session.authed) {
        Object.values(conns).forEach(async (conn, idx) => {
          if(conn == undefined) return;
          conn.c.write(JSON.stringify({
            msg: "spawn",
            numShards: await numShards,
            shardList: await getShardList(idx)
          }))
        });
        res.sendStatus(200)
      } else {
        res.sendStatus(401)
      }
    });

    app.listen(process.env.DIST_WEB_PORT, () => { // Listen on port
        console.log(`Web host listening at http${process.env.DIST_WEB_SECURE == "true" ? "s" : ""}://${process.env.DIST_WEB_HOSTNAME}:${process.env.DIST_WEB_PORT}`)
    })
  }

  var net = require('net');
  
  let conns = {};
  const server = net.createServer((c) => {
    let id = "unknown";
    // 'connection' listener.
    c.on('data', (data) => {
      let jsonData = JSON.parse(data);
      if(JSON.parse(process.env.DIST_WHITELIST).indexOf(jsonData.id) != -1 && (conns[jsonData.id] == undefined || conns[jsonData.id].connected == false)) {
        id = jsonData.id
        console.log("Connection ID : " + id)
        jsonData.connected = true;
        jsonData.c = c;
        conns[id] = jsonData;
      } else {
        c.end();
      }
    });
    c.on('end', () => {
      if(conns[id]) {
        console.log(`Client [${id}] disconnected`);
        conns[id].connected = false;
      } else {
        console.log(`Unauthorised connection refused`);
      }
    });
    c.on('error', (err) => {
      console.error(`Client [${id}] may have just crashed`)
      if(conns[id]) conns[id].connected = false;
    })
  });
  server.on('error', (err) => {
    console.error(err);
  });
  server.listen(process.env.DIST_SOCKET_PORT, () => {
    console.log('Server bound');
  });
}
start();