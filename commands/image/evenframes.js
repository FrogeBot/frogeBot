require("dotenv").config()

const { Worker } = require('worker_threads');
const { readBuffer } = require("../../modules/image.js");

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, sendImage } = require("../../modules/utils.js")
var gm = require('gm');
if(process.env.USE_IMAGEMAGICK == "true") {
    gm = gm.subClass({ imageMagick: true });
}

let procMsg
let imgUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()
        
        imgUrl = await findImage(msg)
        let extension = imgUrl.split("?")[0].split(".")[imgUrl.split(".").length-1];

        if(imgUrl.match(/(\.gif)/gi)) {
            try {
                let worker = new Worker(__dirname+"/../../modules/gif-worker.js")
                worker.postMessage({ imgUrl, list: null, frameSkip: 2, speed: 0.5 })
    
                worker.on('message', async (img) => {
                    if(img != null) {
                        sendImage(msg, "Even Frames", startTime, img, procMsg)
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