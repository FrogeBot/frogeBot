require("dotenv").config();

function findImage(msg) {
  return new Promise(async (resolve, reject) => {
    try {
      if (msg.attachments.size > 0) {
        // If message has image attachment
        let imgUrl = await msg.attachments.first();
        resolve(imgUrl.proxyURL); // Resolve image URL
      } else if (msg.embeds[0] && msg.embeds[0].type == "image") {
        // If message has image embed
        let imgUrl = msg.embeds[0].url;
        resolve(imgUrl); // Resolve image URL
      } else {
        // Channel searching (25 messages)
        let messages = await msg.channel.messages.fetch({ limit: 25 });
        let attachmentMessages = messages
          .map((message) => {
            let attachmentURL = undefined;
            if (message.attachments.first()) {
              attachmentURL = message.attachments.first().proxyURL; // If message has image attachment set as URL
            } else {
              if (message.embeds[0] && message.embeds[0].type == "image") {
                attachmentURL = message.embeds[0].url; // If message has image embed set as URL
              }
              if (message.embeds[0] && message.embeds[0].type == "gifv") {
                attachmentURL =
                  message.embeds[0].url +
                  (message.embeds[0].url.match(/(\.gif)/gi) ? "" : ".gif"); // If message has gifv embed set as URL (Ensuring it ends with .gif)
              }
              if (message.embeds[0] && message.embeds[0].image != null) {
                attachmentURL = message.embeds[0].image.url; // If message is an embed with an image
              }
            }
            if (attachmentURL) return attachmentURL; // Return image URL for each message
          })
          .filter((a) => a != undefined); // Filter out messages with no image
        if (attachmentMessages[0]) {
          resolve(attachmentMessages[0]); // Resolve image URL
        } else {
          reject("No Image found");
        }
      }
    } catch (e) {
      reject(e);
    }
  });
}

const timeVals = {
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000,
};
function formatDuration(millis) {
  let str = [];
  switch (true) {
    case millis >= timeVals.day:
      str.push(Math.floor(millis / timeVals.day) + "d");
      millis = millis % timeVals.day;
    case millis >= timeVals.hour:
      str.push(Math.floor(millis / timeVals.hour) + "h");
      millis = millis % timeVals.hour;
    case millis >= timeVals.minute:
      str.push(Math.floor(millis / timeVals.minute) + "m");
      millis = millis % timeVals.minute;
    default:
      str.push(millis / timeVals.second + "s");
  }
  return str.join(" ");
}

function clamp(input, min, max) {
  return Math.min(Math.max(input, min), max);
}

const gm = require("gm");

const fs = require("fs").promises;
const path = require("path");
const { MessageAttachment, MessageEmbed } = require("discord.js");

const extensions = {
  PNG: "png",
  JPEG: "jpg",
  GIF: "gif",
  WEBP: "webp",
  MPEG: "mp4",
};

async function sendImage(
  msg,
  cmdName,
  startTime,
  img,
  extension,
  procMsg,
  forceWeb = false
) {
  if (procMsg) procMsg.edit(process.env.MSG_UPLOADING);

  extension = await new Promise((resolve, reject) => {
    gm(img).format({ bufferStream: true }, function (err, format) {
      if (err) {
        resolve(extension.toLowerCase());
      } else {
        resolve(extensions[format] || format.toLowerCase());
      }
    });
  });

  const attachment = new MessageAttachment(img, "image." + extension);
  let timeTaken = formatDuration(new Date().getTime() - startTime);

  if (forceWeb) {
    attemptSendImageWeb(msg, cmdName, timeTaken, img, extension, procMsg);
  } else {
    let embed = new MessageEmbed({
      title: cmdName,
      description: `<@${msg.author.id}> ${process.env.MSG_SUCCESS}`,
      color: Number(process.env.EMBED_COLOUR),
      timestamp: new Date(),
      author: {
        name: process.env.BOT_NAME,
        icon_url: msg.client.user.displayAvatarURL(),
      },
      footer: {
        text: `Took ${timeTaken}`,
      },
    })
      .attachFiles(attachment)
      .setImage("attachment://image." + extension);
    msg.channel
      .send({ embed })
      .then(() => {
        msg.channel.stopTyping();
        if (procMsg) procMsg.delete();
      })
      .catch(async () => {
        attemptSendImageWeb(msg, cmdName, timeTaken, img, extension, procMsg);
      });
  }
}

async function attemptSendImageWeb(
  msg,
  cmdName,
  timeTaken,
  img,
  extension,
  procMsg
) {
  if (process.env.WEB_ENABLED == "true") {
    await fs.writeFile(
      path.join(__dirname, `/../web_images/${msg.id}.${extension}`),
      img
    );
    setTimeout(
      () =>
        fs.unlink(
          path.join(__dirname, `/../web_images/${msg.id}.${extension}`)
        ),
      timeVals.minute * Number(process.env.WEB_SAVE_MINS)
    );
    let imgUrl = `http${process.env.WEB_SECURE == "true" ? "s" : ""}://${
      process.env.WEB_HOSTNAME
    }/images/${msg.id}.${extension}${
      process.env.WEB_REFRESH_CACHE == "true"
        ? `?q=${Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, "")
            .substr(0, 8)}`
        : ""
    }`;
    let embed = new MessageEmbed({
      title: cmdName,
      description: `<@${msg.author.id}> - ${process.env.MSG_SEND_LOCAL}\nImage will be available for ${process.env.WEB_SAVE_MINS} minutes.\n[Open Image](${imgUrl})`,
      color: Number(process.env.EMBED_COLOUR),
      timestamp: new Date(),
      author: {
        name: process.env.BOT_NAME,
        icon_url: msg.client.user.displayAvatarURL(),
      },
      image: {
        url: imgUrl,
      },
      footer: {
        text: `Took ${timeTaken}`,
      },
    });
    msg.channel.send({ embed }).then(() => {
      msg.channel.stopTyping();
      if (procMsg) procMsg.delete();
    });
  } else {
    msg.channel
      .send({
        embed: {
          title: "Error",
          description: `<@${msg.author.id}> - ${process.env.MSG_SEND_FAIL}`,
          color: Number(process.env.EMBED_COLOUR),
          timestamp: new Date(),
          author: {
            name: process.env.BOT_NAME,
            icon_url: msg.client.user.displayAvatarURL(),
          },
        },
      })
      .then(() => {
        msg.channel.stopTyping();
        if (procMsg) procMsg.delete();
      });
  }
}

// Exports
module.exports = {
  findImage,
  sendImage,
  formatDuration,
  clamp,
};
