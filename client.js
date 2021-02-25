require("dotenv").config() // Get .env

// Init discord.js
const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require("fs")
const YAML = require('yaml')

const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8'))

let { slashCommands } = require("./modules/utils")
let { handleCmdMsg, handleCmdSlash } = require("./modules/commands")

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  if(process.env.SLASH_COMMANDS_ENABLED == "true") {
    JSON.parse(process.env.SLASH_COMMANDS_GUILDS).forEach(guildID => {
      slashCommands.init(client, commands, process.env.SLASH_COMMANDS_SCOPE, guildID.toString())
    });
  }
});

client.ws.on('INTERACTION_CREATE', async interaction => {
  client.api.interactions(interaction.id, interaction.token).callback.post({data: { type: 5 }})
  handleCmdSlash(client, interaction, musicWorker)
})

client.on('error', (error) => {
    console.log(error);
});

process.on('uncaughtException', function (err) {
    console.log(err);
})

client.on('message', async msg => {
  handleCmdMsg(msg, musicWorker)
});

let musicWorker;
if(process.env.MUSIC_ENABLED == "true") {
    const { Worker } = require('worker_threads');

    const musicWorkerPath = '/modules/music-worker.js'
    musicWorker = new Worker(__dirname+musicWorkerPath)
}

var path = require('path'); 

if(process.env.WEB_ENABLED == "true") {
    fs.mkdir("web_images", { recursive: true }, (err) => { 
        if (err) { 
            return console.error(err); 
        }
        console.log('Created web_images directory.'); 
    });
}
function gracefulShutdown() {
    client.destroy();
    console.log("Destroyed client")
    if(process.env.WEB_ENABLED == "true") {
        fs.rmdir("web_images", { recursive: true }, () => {
            console.log('Removed web_images directory.');
            process.exit();
        })
    } else {
        process.exit();
    }
}

if(process.env.WEB_ENABLED == "true") {
    const express = require('express')
    const app = express()

    // set up rate limiter: maximum of five requests per minute
    var RateLimit = require('express-rate-limit');
    var limiter = new RateLimit({
        windowMs: 1*60*1000, // 1 minute
        max: 50
    });

    // apply rate limiter to all requests
    app.use(limiter);

    app.use(express.static("web/public"))
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname,"web/index.html"))
    })

    app.get("/images/*", async (req, res) => {
        let imgPath = path.join(__dirname,"web_images/"+req.path.split("/")[2])
        if (fs.existsSync(imgPath)) {
            const r = fs.createReadStream(imgPath)
            r.pipe(res)
        } else {
            const r = fs.createReadStream("assets/imageExpired.png")
            r.pipe(res)
        }
    })

    app.listen(process.env.WEB_PORT, () => {
        console.log(`Web host listening at http${process.env.WEB_SECURE == "true" ? "s" : ""}://${process.env.WEB_HOSTNAME}:${process.env.WEB_PORT}`)
    })
}

// e.g. kill
process.on('SIGTERM', gracefulShutdown);

// e.g. Ctrl + C
process.on('SIGINT', gracefulShutdown);

client.login(process.env.TOKEN); // discord.js connect to discord bot