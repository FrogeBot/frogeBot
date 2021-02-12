require("dotenv").config()

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, sendImage } = require("../../modules/utils.js")

delete require.cache[require.resolve("../../modules/image.js")];
let { exec, jimpReadURL } = require("../../modules/image.js")

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()
        
        imageUrl = await findImage(msg)
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];
        
        let img = await jimpReadURL(imageUrl);
        let size = (img.bitmap.height >= img.bitmap.width) ? img.bitmap.width : img.bitmap.height;

        sendImage(msg, "Square", startTime, img, extension, procMsg)
    } catch(e) {
        console.log(e)
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