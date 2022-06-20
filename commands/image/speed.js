require("dotenv").config()

const { Worker } = require('worker_threads');

let { findImage, sendImage } = require("../../modules/utils.js")

let procMsg
let imgUrl
async function cmdFunc(msg, args, startTime) {
    try {
        // Send processing message
        procMsg = await msg.reply(process.env.MSG_PROCESSING);
        // msg.channel.startTyping()
        
        imgUrl = await findImage(msg) // Find image in channel
        let extension = imgUrl.split("?")[0].split(".")[imgUrl.split(".").length-1]; // Get extension of image

        if(imgUrl.match(/(\.gif)/gi)) { // If type is GIF
            try {
                let worker = new Worker(require.resolve("@frogebot/image/workers/gif")) // Spawn GIF worker
                worker.postMessage({ imgUrl, list: null, frameSkip: 1, speed: 2, options: { imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE }  }) // Send message to GIF worker
    
                worker.on('message', async (img) => { // When a response is recieved
                    if(img != null) {
                        sendImage(msg, "Speed", startTime, img, extension, procMsg) // Send image
                    } else {
                        // msg.channel.stopTyping()
                        msg.followUp({
                            embeds: [ {
                                "title": "Error",
                                "description": `<@${msg.member.id}> - ${ imgUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}`,
                                "color": Number(process.env.EMBED_COLOUR),
                                "timestamp": new Date(),
                                "author": {
                                    "name": process.env.BOT_NAME,
                                    "icon_url": msg.client.user.displayAvatarURL()
                                }
                            }]
                        })
                        // procMsg.delete();
                    }
                });
            } catch(e) {
                console.log(e)
                reject(e)
            }
        } else {
            // msg.channel.stopTyping()
            msg.followUp({
                embeds: [ {
                    "title": "Error",
                    "description": `<@${msg.member.id}> - Not a GIF image`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    }
                }]
            })
            // procMsg.delete();
        }
    } catch(e) {
        console.log(e)
        // msg.channel.stopTyping()
        msg.followUp({
            embeds: [ {
                "title": "Error",
                "description": `<@${msg.member.id}> - ${ imgUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}\n${"```" + e + "```"}`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }]
        })
        // procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}