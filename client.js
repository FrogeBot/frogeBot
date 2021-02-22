require("dotenv").config() // Get .env

// Init discord.js
const Discord = require('discord.js');
const client = new Discord.Client();

// Log when client is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Catch discord.js errors
client.on('error', (error) => {
    console.log(error);
});

// Catch process errors
process.on('uncaughtException', function (err) {
    console.log(err);
})

const { parseMsg, isCmd } = require("./modules/parse.js") // Import command parsing functions

// Ready and parse commands.yml
const fs = require("fs")
const YAML = require('yaml')
const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8'))

// Import image module
let { exec, execGM, getFormat } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })

let { findImage, sendImage } = require("./modules/utils.js") // Import image util commands

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
                    newR = cmd.r.split('||')[i].trim() // Separate potential r value
                    if(newR.match(/\(input\)/) && args.length > 0) { // If r accepts input and args are present
                        newR = newR.replace(/\(input\)/, args) // Replace with input value
                        if(cmd.r_type == 'int' && Number.isInteger(Number(newR))) r = newR // int type handling
                        if(cmd.r_type == 'num' && !Number.isNaN(Number(newR))) r = newR // num type handling
                    } else if(newR.match(/\(input\:[0-9]+\)/) && args.length > 0) { // If r accepts certain word of input and args are present
                        newR = newR.replace(/\(input:[0-9]+\)/, args.split(' ')[newR.replace(')','').split(':')[1]]) // Replace with input value
                        if(cmd.r_type.startsWith('int') && Number.isInteger(Number(newR))) r = newR // int type handling
                        if(cmd.r_type.startsWith('num') && !Number.isNaN(Number(newR))) r = newR // num type handling
                    } else if(!newR.match(/\(input\)/) && !newR.match(/\(input\:[0-9]+\)/)) { // If r is just a value
                        r = newR; // Set r with no worries :)
                    }
                }
            }
            // Parse "r" as a number with constraints if required
            if(cmd.r_type == 'int') r = parseInt(r)
            if(cmd.r_type == 'num') r = Number(r)
            if(cmd.r_type == 'int>0') r = Math.max(0, parseInt(r))
            if(cmd.r_type == 'num>0') r = Math.max(0, Number(r))

            // Replace "(r)" with the variable r in params
            let list = cmd.list.map(l => { if(typeof l == "object") { return [ Object.keys(l)[0], l[Object.keys(l)[0]].params.map(p => { if(p == '(r)') { return r } else { return p } }) ] } else { return [ l, [] ] } })
            
            // Execute command
            let img;
            if(cmd.library == 'jimp') img = await exec(imageUrl, list); // Execute with jimp
            if(cmd.library == 'magick') img = await execGM(imageUrl, list); // Execute with magick

            let extension = await getFormat(imageUrl) // Get extension of the output image

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
        musicWorker.postMessage({ msgId: msg.id, channelId: msg.channel.id, args, cmd }) // Post message to music worker
    }
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