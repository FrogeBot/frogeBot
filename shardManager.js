const { ShardingManager } = require('discord.js');
require("dotenv").config() // Get .env

const { fetchRecommendedShards } = require("./node_modules/discord.js/src/util/Util.js");
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
    if(process.env.SHARD_WEB_ENABLED == "true") { // If using web
        fs.rm("web_images", { recursive: true }, () => { // Remove web_images directory
            console.log('Removed web_images directory.');
            process.exit(); // Exit node process
        })
    } else {
        process.exit(); // Exit node process
    }
  }

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
  
  const manager = new ShardingManager('./client.js', { token: process.env.TOKEN, totalShards: await fetchRecommendedShards(process.env.TOKEN, { guildsPerShard: process.env.GUILDS_PER_SHARD }) });

  manager.on('shardCreate', shard => {
    console.log(`Shard ${shard.id} : Launched`)
    shard.on('message', data => {
      if(data[0] == "log") console.log(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "error") console.error(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "info") console.info(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "warn") console.warn(`Shard ${shard.id} : ${data[1]}`)
      if(data[0] == "debug") console.debug(`Shard ${shard.id} : ${data[1]}`)
    });
  });

  manager.spawn();
}
start();