require("dotenv").config() // Get .env

const os = require("os")
const net = require('net'),
      JsonSocket = require('json-socket');

const { ShardingManager } = require('discord.js');

const { fetchRecommendedShards } = require("./node_modules/discord.js/src/util/Util.js");
async function start() {
  const client = new JsonSocket(new net.Socket());
  client.connect({ port: process.env.DIST_SOCKET_PORT, host: process.env.DIST_SOCKET_HOST });
  client.on('connect', function() {
    // 'connect' listener.
    console.log('Connected to server');
    client.sendMessage({ msg: "connect", id: process.env.DIST_ID, webEnabled: process.env.SHARD_WEB_ENABLED == "true", webHostname: process.env.SHARD_WEB_HOSTNAME, webPort: process.env.SHARD_WEB_PORT, weight: (process.env.DIST_WEIGHT == "AUTO" || !Number.isInteger(Number(process.env.DIST_WEIGHT)) ? os.cpus().length : Number(process.env.DIST_WEIGHT)) });
  });
  client.on('message', (jsonData) => {
    //jsonData = JSON.parse(data);
    console.dir(jsonData)
    if(jsonData.msg == "spawn") {
      manager.totalShards = jsonData.numShards;
      manager.shardList = jsonData.shardList;
      jsonData.shardList.forEach(shardId => {
        if(!manager.shards.has(shardId)) {
          manager.createShard(shardId);
        }
        manager.shards.get(shardId).spawn();
      })
      //manager.spawn().catch(console.log);
    }
    if(jsonData.msg == "kill") {
      jsonData.shardList.forEach(shardId => {
        if(manager.shards.has(shardId)) {
          manager.shards.get(shardId).kill();
        }
      })
    }
    if(jsonData.msg == "restart") {
      jsonData.shardList.forEach(shardId => {
        if(manager.shards.has(shardId)) {
          manager.shards.get(shardId).respawn();
        }
      })
    }
  });
  client.on('end', () => {
    console.log('Disconnected from server');
    gracefulShutdown();
  });
  client.on('error', () => {
    console.log('Disconnected from server');
    gracefulShutdown();
  });

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
    client.sendMessage({ msg: "clientShutdown", id: process.env.DIST_ID });
    if(process.env.SHARD_WEB_ENABLED == "true") { // If using web
        fs.rm("web_images", { recursive: true }, () => { // Remove web_images directory
            console.log('Removed web_images directory.');
            process.exit(); // Exit node process
        })
    } else {
        process.exit(); // Exit node process
    }
  }

  // Catch process errors
  process.on('uncaughtException', function (err) {
    console.log(err);
  })

  // e.g. kill
  process.on('SIGTERM', gracefulShutdown);

  // e.g. Ctrl + C
  process.on('SIGINT', gracefulShutdown);

  if(process.env.SHARD_WEB_ENABLED == "true") { // If using web
      fs.mkdir("web_images", { recursive: true }, (err) => { 
          if (err) { 
              return console.error(err); 
          }
          console.log('Created web_images directory.'); 
      });
      const express = require('express')
      const app = express() // Create express server

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

      app.listen(process.env.SHARD_WEB_PORT, () => { // Listen on port
          console.log(`Web host listening at http${process.env.SHARD_WEB_SECURE == "true" ? "s" : ""}://${process.env.SHARD_WEB_HOSTNAME}:${process.env.SHARD_WEB_PORT}`)
      })
  }
  
  const manager = new ShardingManager('./client.js', { token: process.env.TOKEN, respawn: true, mode: 'process' });

  manager.on('shardCreate', shard => {
    shard.on('message', data => {
      if(data[0] == "log") console.log(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "error") console.error(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "info") console.info(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "warn") console.warn(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "debug") console.debug(`Shard ${shard.id} : ${data[1]}`)
    });
    shard.on('spawn', process => {
      console.log(`Shard ${shard.id} : Launched`)
      client.sendMessage({ msg: "shardOnline", shardId: shard.id });
    });
    shard.on('death', process => {
      client.sendMessage({ msg: "shardOffline", shardId: shard.id });
      delete shard;
    })
  });
}
start();