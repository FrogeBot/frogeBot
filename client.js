require("dotenv").config() // Get .env

// Init discord.js
const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require("fs")
const YAML = require('yaml')

const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8'))

let { slashCommands } = require("./modules/utils")
let { handleCmdMsg, handleCmdSlash } = require("./modules/commands")

// Log when client is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // If slash commands are enabled
  if(process.env.SLASH_COMMANDS_ENABLED == "true") {
    if(process.env.SLASH_COMMANDS_SCOPE == "guild") {
      JSON.parse(process.env.SLASH_COMMANDS_GUILDS).forEach(guildID => { // Parse the list of guilds
        slashCommands.init(client, commands, process.env.SLASH_COMMANDS_SCOPE, guildID.toString()) // Initialise slash commands on a per-guild basis
      });
    } else {
      slashCommands.init(client, commands, process.env.SLASH_COMMANDS_SCOPE) // Initialise slash commands on globally
    }
  }
});

client.ws.on('INTERACTION_CREATE', async interaction => {
  client.api.interactions(interaction.id, interaction.token).callback.post({data: { type: 5 }})
  handleCmdSlash(client, interaction, musicWorker)
})

// Catch discord.js errors
client.on('error', (error) => {
    console.log(error);
});

// Catch process errors
process.on('uncaughtException', function (err) {
    console.log(err);
})

// On message handle command
client.on('message', async msg => {
  handleCmdMsg(msg, musicWorker)
});

// Create music worker
let musicWorker;
if(process.env.MUSIC_ENABLED == "true") {
    const { Worker } = require('worker_threads');

    const musicWorkerPath = '/modules/music-worker.js'
    musicWorker = new Worker(__dirname+musicWorkerPath) // Spawn worker
}

var path = require('path'); 

// Create web_images directory if required
if(process.env.WEB_ENABLED == "true") {
    fs.mkdir("web_images", { recursive: true }, (err) => { 
        if (err) { 
            return console.error(err); 
        }
        console.log('Created web_images directory.'); 
    });
}
function gracefulShutdown() { // When the bot is shut down, it does it politely
    client.destroy(); // Disconnect from Discord
    console.log("Destroyed client")
    if(process.env.WEB_ENABLED == "true") { // If using web
        fs.rmdir("web_images", { recursive: true }, () => { // Remove web_images directory
            console.log('Removed web_images directory.');
            process.exit(); // Exit node process
        })
    } else {
        process.exit(); // Exit node process
    }
}

if(process.env.WEB_ENABLED == "true") { // If using web
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

    app.listen(process.env.WEB_PORT, () => { // Listen on port
        console.log(`Web host listening at http${process.env.WEB_SECURE == "true" ? "s" : ""}://${process.env.WEB_HOSTNAME}:${process.env.WEB_PORT}`)
    })
}

// e.g. kill
process.on('SIGTERM', gracefulShutdown);

// e.g. Ctrl + C
process.on('SIGINT', gracefulShutdown);

client.login(process.env.TOKEN); // discord.js connect to discord bot