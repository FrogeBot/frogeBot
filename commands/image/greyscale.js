require("dotenv").config()
const { MessageAttachment, MessageEmbed } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImag, formatDuratione } = require("../../modules/utils.js")

delete require.cache[require.resolve("../../modules/image.js")];
let { exec } = require("../../modules/image.js")

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()
        
        imageUrl = await findImage(msg)
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1];
        
        let img = await exec(imageUrl, [ ["greyscale", []] ]);
        
        const attachment = new MessageAttachment(img, "image."+extension);
        let timeTaken = formatDuration(new Date().getTime() - startTime)

        let embed = new MessageEmbed({
            "title": "Greyscale",
            "description": `<@${msg.author.id}>`,
            "color": process.env.EMBED_COLOUR,
            "timestamp": new Date(),
            "author": {
                "name": process.env.BOT_NAME,
                "icon_url": msg.client.user.displayAvatarURL()
            },
            "footer": {
                "text": `Took ${timeTaken}`
            }
        }).attachFiles(attachment).setImage("attachment://image."+extension);
        msg.channel.send({ embed }).catch(() => {
            msg.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${msg.author.id}> - Failed to send`,
                    "color": process.env.EMBED_COLOUR,
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    }
                }
            })
        })
        msg.channel.stopTyping()
        procMsg.delete();
    } catch(e) {
        //console.log(e)
        msg.channel.stopTyping()
        msg.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${msg.author.id}> - ${ imageUrl != undefined ? "Something went wrong" : "No images found"}`,
                "color": process.env.EMBED_COLOUR,
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
        procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}