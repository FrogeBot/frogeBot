require("dotenv").config();

let { sendImage } = require("../../modules/utils.js");

let { gmToBuffer } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxGifFrames: process.env.MAX_GIF_FRAMES, maxImageSize: process.env.MAX_IMAGE_SIZE })
let { canvasText } = require("@frogebot/canvas");

var gm = require("gm");
if (process.env.USE_IMAGEMAGICK == "true") {
  gm = gm.subClass({ imageMagick: true });
}

let procMsg;
async function cmdFunc(msg, args, startTime) {
  try {
    // Send processing message
    procMsg = await msg.reply(process.env.MSG_PROCESSING);
    // msg.channel.startTyping();

    let width = 400;
    let textCanvas = await canvasText(
      args[0] ? args[0] : "",
      20,
      "Matoran",
      400,
      "left",
      1.25,
      "white"
    ); // Create text

    textCanvas[0] = await gmToBuffer(
      gm(textCanvas[0]).crop(width, textCanvas[1])
    ); // Crop text canvas

    sendImage(msg, "Matoran", startTime, textCanvas[0], "png", procMsg); // Send image
  } catch (e) {
    console.log(e);
    // msg.channel.stopTyping();
    msg.followUp({
      embeds: [{
        title: "Error",
        description: `<@${msg.member.id}> - ${
          imageUrl != undefined
            ? process.env.MSG_ERROR
            : process.env.MSG_NO_IMAGE
        }\n${"```" + e + "```"}`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: msg.client.user.displayAvatarURL(),
        },
      }],
    });
    // procMsg.delete();
  }
}

module.exports = {
  cmdFunc,
};
