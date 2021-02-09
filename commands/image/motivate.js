require("dotenv").config()
const { MessageAttachment, MessageEmbed } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, formatDuration } = require("../../modules/utils.js")
var Jimp = require('jimp');

delete require.cache[require.resolve("../../modules/image.js")];
let { readURL, readBuffer, exec } = require("../../modules/image.js")
let { canvasRect, canvasText } = require("../../modules/canvas.js");
const { scale } = require("jimp");

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()

        imageUrl = await findImage(msg)
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];

        let imgFG = await readURL(imageUrl);

        
        let height = Math.round(imgFG.bitmap.height+imgFG.bitmap.width*0.05);
        let width = ( height * 4/3 > imgFG.bitmap.width*1.2 ) ? Math.round(height * 4/3) : Math.round(imgFG.bitmap.width*1.2);

        let rectCanvas = await canvasRect(Math.round(imgFG.bitmap.width*1.05), Math.round(imgFG.bitmap.height+imgFG.bitmap.width*0.05), "white", Math.round(imgFG.bitmap.width*0.005), "transparent")

        let textCanvas = await canvasText(args.split("|")[0].trim(), Math.round(width*0.1), "Times New Roman", Math.round(width*0.9), "center", 1.5, "white")

        let textCanvas2 = await canvasText(args.split("|").slice(1).join("|").trim(), Math.round(width*0.07), "Times New Roman", Math.round(width*0.9), "center", 1.5, "white")

        let offset = textCanvas[1]+textCanvas2[1] + width*0.05;

        let img = await exec(imageUrl, [
            ["addBackground", [width, height+offset, "#000000", Math.round(width/2-imgFG.bitmap.width/2), Math.round(width*0.05)] ],
            ["composite", [rectCanvas, Math.round(width/2-imgFG.bitmap.width/2 - Math.round(imgFG.bitmap.width*0.025)), Math.round(width*0.05 - imgFG.bitmap.width*0.025)]],
            ["composite", [textCanvas[0], Math.round(width*0.05), Math.round(height + width*0.05 - imgFG.bitmap.width*0.025)]],
            ["composite", [textCanvas2[0], Math.round(width*0.05), Math.round(height + width*0.05 - imgFG.bitmap.width*0.025)+textCanvas[1]]]
        ]).catch(e => {
            throw e
        });
        
        const attachment = new MessageAttachment(img, "image."+extension);
        let timeTaken = formatDuration(new Date().getTime() - startTime)

        let embed = new MessageEmbed({
            "title": "Motivate",
            "description": `<@${msg.author.id}>`,
            "color": Number(process.env.EMBED_COLOUR),
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
                    "color": Number(process.env.EMBED_COLOUR),
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
}

module.exports = {
    cmdFunc
}