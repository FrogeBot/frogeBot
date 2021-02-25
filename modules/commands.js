require("dotenv").config() // Get .env

const { WebhookClient } = require("discord.js")

const fs = require("fs")
const YAML = require('yaml')

const commands = YAML.parse(fs.readFileSync('./commands.yml', 'utf8'))

let { exec, execGM, getFormat } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })
let { findImage, sendImage } = require("./utils")

const { parseMsg, isCmd } = require("./parse")

async function handleCmdMsg(msg, musicWorker) {
    if(msg.author.bot || !await isCmd(msg)) return // If not command or called by bot

    let parsed = await parseMsg(msg); // Parses message, returns [0: Prefix, 1: Command, 2: Args string]
    
    let cmd = commands[parsed[1]]
    let args = parsed[2]

    handleCmd(msg, cmd, args, musicWorker)
}

async function handleCmdSlash(client, interaction, musicWorker) {
    let cmd = commands[interaction.data.name]
    if(cmd == undefined) return

    let args = interaction.data.options
    if(args != undefined) args = args.map(a => a.value).join(' ')
    else args = ""

    let channel = await client.channels.fetch(interaction.channel_id)
    let guild = await client.guilds.resolve(interaction.guild_id)
    
    let msg = {
        interaction,
        client,
        author: await client.users.fetch(interaction.member.user.id),
        channel,
        member: await guild.members.fetch(interaction.member.user.id),
        guild,
    }

    msg.channel.send = async function(content, options) {
        let res = options || {}
        if(typeof content == "object") {
            res.content = ""
            res = content
            res.embeds = [content.embed]
        } else {
            res.content = content
            if(options) res.embeds = [options.embed]
        }
        new WebhookClient(client.user.id, interaction.token).send(res)
    }
    handleCmd(msg, cmd, args, musicWorker)
}

async function handleCmd(msg, cmd, args, musicWorker) {
    let startTime = new Date().getTime()

    if(cmd.type == 'script') { // If command is set as script type
        let { cmdFunc } = require('../'+cmd.path) // Gets function of command
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
        musicWorker.postMessage({ msgId: msg.id, interaction: msg.interaction, channelId: msg.channel.id, args, cmd })
    }
}

module.exports = {
    handleCmdMsg,
    handleCmdSlash
}