require("dotenv").config()
const { MessageAttachment } = require('discord.js');
const { Worker } = require('worker_threads');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")

async function cmdFunc(msg, args) {
    try {
        let procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()
        
        let imgUrl = await findImage(msg)
        let extension = imgUrl.split(".")[imgUrl.split(".").length-1].split("?")[0];

        if(imgUrl.match(/(\.gif)/gi)) {
            try {
                let worker = new Worker(__dirname+"/../../modules/gif-worker.js")
                worker.postMessage({ imgUrl, list: null, frameSkip: 2, speed: 0.5 })
    
                worker.on('message', async (img) => {
                    const attachment = new MessageAttachment(Buffer.from(img), "image."+extension);
                    msg.channel.stopTyping()
                    msg.channel.send(attachment)
                    procMsg.delete();
                });
            } catch(e) {
                console.log(e)
                reject(e)
            }
        } else {
            msg.channel.stopTyping()
            msg.channel.send("GIF image not supplied")
            procMsg.delete();
        }
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send("It broke")
    }
}

module.exports = {
    cmdFunc
}