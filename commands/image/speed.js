require("dotenv").config()
const { MessageAttachment, MessageEmbed } = require('discord.js');
const { Worker } = require('worker_threads');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, formatDuration } = require("../../modules/utils.js")

let procMsg
let imgUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()
        
        imgUrl = await findImage(msg)
        let extension = imgUrl.split("?")[0].split(".")[imgUrl.split(".").length-1];

        if(imgUrl.match(/(\.gif)/gi)) {
            try {
                let worker = new Worker(__dirname+"/../../modules/gif-worker.js")
                worker.postMessage({ imgUrl, list: null, frameSkip: 1, speed: 2 })
    
                worker.on('message', async (img) => {
                    if(img != null) {
                        const attachment = new MessageAttachment(Buffer.from(img), "image."+extension);
                        let timeTaken = formatDuration(new Date().getTime() - startTime)
                
                        let embed = new MessageEmbed({
                            "title": "Speed",
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
                    } else {
                        msg.channel.stopTyping()
                        msg.channel.send({
                            embed: {
                                "title": "Error",
                                "description": `<@${msg.author.id}> - ${ imgUrl != undefined ? "Something went wrong" : "No images found"}`,
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
                });
            } catch(e) {
                console.log(e)
                reject(e)
            }
        } else {
            msg.channel.stopTyping()
            msg.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${msg.author.id}> - Not a GIF image`,
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
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${msg.author.id}> - ${ imgUrl != undefined ? "Something went wrong" : "No images found"}`,
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