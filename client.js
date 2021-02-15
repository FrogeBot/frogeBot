require("dotenv").config() // Get .env

// Init discord.js
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', (error) => {
    console.log(error);
});

process.on('uncaughtException', function (err) {
    console.log(err);
})

const { parseMsg, isCmd } = require("./modules/parse.js")

const fs = require("fs")
const YAML = require('yaml')

const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8'))

let { exec, execGM, getFormat } = require("./modules/image.js")
let { findImage, sendImage } = require("./modules/utils.js")

client.on('message', async msg => {
    if(msg.author.bot || !await isCmd(msg)) return // If not command or called by bot

    let parsed = await parseMsg(msg); // Parses message, returns [0: Prefix, 1: Command, 2: Args string]
    
    let cmd = commands[parsed[1]]
    let args = parsed[2]
    let startTime = new Date().getTime()

    if(cmd.type == 'script') { // If command is set as script type
        let { cmdFunc } = require('./'+cmd.path) // Gets function of command
        setImmediate(async () => {
            cmdFunc(msg, args, startTime) // Runs command function
        });
    } else if (cmd.type == 'image') { // If command is set as image type
        let imageUrl = await findImage(msg); // Find image in channel
        try {
            procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
            msg.channel.startTyping()

            let r;
            if(cmd.r) { // Handle replacement of input args in "r" val of command
                for(let i = cmd.r.split('||').length-1; i >= 0; i--) {
                    newR = cmd.r.split('||')[i].trim()
                    if(newR.match(/\(input\)/) && args.length > 0) {
                        newR = newR.replace(/\(input\)/, args)
                        if(cmd.r_type == 'int' && Number.isInteger(Number(newR))) r = newR
                        if(cmd.r_type == 'num' && !Number.isNaN(Number(newR))) r = newR
                    } else if(newR.match(/\(input\:[0-9]+\)/) && args.length > 0) {
                        newR = newR.replace(/\(input:[0-9]+\)/, args.split(' ')[newR.replace(')','').split(':')[1]])
                        if(cmd.r_type.startsWith('int') && Number.isInteger(Number(newR))) r = newR
                        if(cmd.r_type.startsWith('num') && !Number.isNaN(Number(newR))) r = newR
                    } else if(!newR.match(/\(input\)/) && !newR.match(/\(input\:[0-9]+\)/)) {
                        r = newR;
                    }
                }
            }
            // Parse "r" as a number if required
            if(cmd.r_type == 'int') r = parseInt(r)
            if(cmd.r_type == 'num') r = Number(r)
            if(cmd.r_type == 'int>0') r = Math.max(0, parseInt(r))
            if(cmd.r_type == 'num>0') r = Math.max(0, Number(r))

            // Replace "(r)" with the variable r in params
            let list = cmd.list.map(l => { if(typeof l == "object") { return [ Object.keys(l)[0], l[Object.keys(l)[0]].params.map(p => { if(p == '(r)') { return r } else { return p } }) ] } else { return [ l, [] ] } })
            
            // Execute command
            let img;
            if(cmd.library == 'jimp') img = await exec(imageUrl, list);
            if(cmd.library == 'magick') img = await execGM(imageUrl, list);

            let extension = await getFormat(imageUrl)

            // Send image
            sendImage(msg, cmd.title, startTime, img, extension, procMsg)
        } catch(e) {
            // If error, catch it and let the user know
            console.log(e)
            msg.channel.stopTyping()
            msg.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${msg.author.id}> - ${ imageUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    }
                }
            })
            procMsg.delete();
        }
    } else if (cmd.type == 'music' && process.env.MUSIC_ENABLED == "true") { // If command is set as music type
        musicWorker.postMessage({ msgId: msg.id, channelId: msg.channel.id, args, cmd })
    }
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