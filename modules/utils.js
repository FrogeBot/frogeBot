require("dotenv").config();
const {
  ApplicationCommandOptionTypes,
} = require("../node_modules/discord.js/src/util/Constants.js");

function findImage(msg) {
  return new Promise(async (resolve, reject) => {
    try {
      // if (msg.attachments.size > 0) {
      //   // If message has image attachment
      //   let imgUrl = await msg.attachments.first();
      //   resolve(imgUrl.proxyURL); // Resolve image URL
      // } else if (msg.embeds[0] && msg.embeds[0].type == "image") {
      //   // If message has image embed
      //   let imgUrl = msg.embeds[0].url;
      //   resolve(imgUrl); // Resolve image URL
      // } else {
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
      // }
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
      str.push(Math.floor(millis / timeVals.day) + "d"); // Days
      millis = millis % timeVals.day;
    case millis >= timeVals.hour:
      str.push(Math.floor(millis / timeVals.hour) + "h"); // Hours
      millis = millis % timeVals.hour;
    case millis >= timeVals.minute:
      str.push(Math.floor(millis / timeVals.minute) + "m"); // Minutes
      millis = millis % timeVals.minute;
    default:
      str.push(millis / timeVals.second + "s"); // Seconds (with decimal)
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
    // Get extension from file type
    gm(img).format({ bufferStream: true }, function (err, format) {
      if (err) {
        resolve(extension.toLowerCase());
      } else {
        resolve(extensions[format] || format.toLowerCase());
      }
    });
  });
  const attachment = new MessageAttachment(
    Buffer.from(img),
    "image." + extension
  ); // Create attachment
  let timeTaken = formatDuration(new Date().getTime() - startTime); // Time elapsed since command call

  if (forceWeb) {
    // Skip Discord CDN entirely
    attemptSendImageWeb(msg, cmdName, timeTaken, img, extension, procMsg); // Send image via local web host
  } else {
    // Send image on Discord
    let embed = new MessageEmbed({
      title: cmdName,
      description: `<@${msg.member.id}> ${process.env.MSG_SUCCESS}`,
      color: Number(process.env.EMBED_COLOUR),
      timestamp: new Date(),
      author: {
        name: process.env.BOT_NAME,
        icon_url: msg.client.user.displayAvatarURL(),
      },
      image: {
        url: "attachment://image." + extension,
      },
      footer: {
        text: `Took ${timeTaken}`,
      },
    });
    msg
      .followUp({ embeds: [embed], files: [attachment] })
      .then(() => {
        // msg.channel.stopTyping();
        //if (procMsg) procMsg.delete();
      })
      .catch(async (err) => {
        console.log(err);
        attemptSendImageWeb(msg, cmdName, timeTaken, img, extension, procMsg); // If send fails, try with local web host
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
    // If web enabled
    let imgName = `${msg.id}_${Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .substr(0, 4)}.${extension}`;
    await fs.writeFile(path.join(__dirname, `/../web_images/${imgName}`), img);
    setTimeout(
      () => fs.unlink(path.join(__dirname, `/../web_images/${imgName}`)),
      timeVals.minute * Number(process.env.WEB_SAVE_MINS)
    ); // Remove file after process.env.WEB_SAVE_MINS minutes
    let imgUrl = `http${process.env.WEB_SECURE == "true" ? "s" : ""}://${
      process.env.WEB_HOSTNAME
    }/images/${imgName}`;
    let embed = new MessageEmbed({
      title: cmdName,
      description: `<@${msg.member.id}> - ${process.env.MSG_SEND_LOCAL}\nImage will be available for ${process.env.WEB_SAVE_MINS} minutes.\n[Open Image](${imgUrl})`,
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
    msg.editReply({ embeds: [embed] }).then(() => {
      // msg.channel.stopTyping();
      //if (procMsg) procMsg.delete();
    });
  } else {
    // If web isn't enabled, just act like a regular failure
    msg
      .editReply({
        embeds: [
          {
            title: "Error",
            description: `<@${msg.member.id}> - ${process.env.MSG_SEND_FAIL}`,
            color: Number(process.env.EMBED_COLOUR),
            timestamp: new Date(),
            author: {
              name: process.env.BOT_NAME,
              icon_url: msg.client.user.displayAvatarURL(),
            },
          },
        ],
      })
      .then(() => {
        // msg.channel.stopTyping();
        //if (procMsg) procMsg.delete();
      });
  }
}

const interactionTypes = ["COMMAND", "USER", "MESSAGE"];
const optionTypes = [
  "SUB_COMMAND",
  "SUB_COMMAND_GROUP",
  "STRING",
  "INTEGER",
  "BOOLEAN",
  "USER",
  "CHANNEL",
  "ROLE",
  "MENTIONABLE",
  "NUMBER",
];
async function slashCommandInit(client, commands, scope, guildID = null) {
  if (process.env.MUSIC_ENABLED != "true") {
    Object.keys(commands).forEach((cmd) => {
      if (commands[cmd].type == "music") delete commands[cmd];
    });
  }
  if (scope == "guild") {
    try {
      client.application.commands.holds.transformOption = function (
        option,
        received
      ) {
        const stringType =
          typeof option.type === "string"
            ? option.type
            : ApplicationCommandOptionTypes[option.type];
        const channelTypesKey = received ? "channelTypes" : "channel_types";
        return {
          type:
            typeof option.type === "number" && !received
              ? option.type
              : ApplicationCommandOptionTypes[option.type],
          name: option.name,
          description: option.description,
          min_value: option.min_value,
          max_value: option.max_value,
          required:
            option.required ??
            (stringType === "SUB_COMMAND" || stringType === "SUB_COMMAND_GROUP"
              ? undefined
              : false),
          autocomplete: option.autocomplete,
          choices: option.choices,
          options: option.options?.map((o) =>
            this.transformOption(o, received)
          ),
          [channelTypesKey]: received
            ? option.channel_types?.map((type) => ChannelTypes[type])
            : option.channelTypes?.map((type) =>
                typeof type === "string" ? ChannelTypes[type] : type
              ) ??
              // When transforming to API data, accept API data
              option.channel_types,
        };
      };
      let cmdsList = [];
      Object.keys(commands).forEach((cmd) => {
        if (!commands[cmd].hidden && commands[cmd].description.length >= 1) {
          if (commands[cmd].interactions) {
            for (let i = 0; i < commands[cmd].interactions.length; i++) {
              let type = Math.max(
                1,
                interactionTypes.indexOf(commands[cmd].interactions[i]) + 1
              );
              let commandFormatted = {
                name: cmd,
                type,
                description:
                  type == 1
                    ? commands[cmd].description.replace(/\`/g, "")
                    : undefined,
                options:
                  commands[cmd].options && type == 1
                    ? commands[cmd].options.map((o) => {
                        o.type = optionTypes.indexOf(o.type) + 1;
                        return o;
                      })
                    : undefined,
              };
              cmdsList.push(commandFormatted);
            }
          } else {
            let commandFormatted = {
              name: cmd,
              description: commands[cmd].description.replace(/\`/g, ""),
              options: commands[cmd].options
                ? commands[cmd].options.map((o) => {
                    o.type = optionTypes.indexOf(o.type) + 1;
                    return o;
                  })
                : undefined,
            };
            cmdsList.push(commandFormatted);
          }
        }
      });
      client.application.commands.set(cmdsList, guildID);
    } catch (e) {
      console.log(e);
    }
  } else {
    try {
      client.application.commands.holds.transformOption = function (
        option,
        received
      ) {
        const stringType =
          typeof option.type === "string"
            ? option.type
            : ApplicationCommandOptionTypes[option.type];
        const channelTypesKey = received ? "channelTypes" : "channel_types";
        return {
          type:
            typeof option.type === "number" && !received
              ? option.type
              : ApplicationCommandOptionTypes[option.type],
          name: option.name,
          description: option.description,
          min_value: option.min_value,
          max_value: option.max_value,
          required:
            option.required ??
            (stringType === "SUB_COMMAND" || stringType === "SUB_COMMAND_GROUP"
              ? undefined
              : false),
          autocomplete: option.autocomplete,
          choices: option.choices,
          options: option.options?.map((o) =>
            this.transformOption(o, received)
          ),
          [channelTypesKey]: received
            ? option.channel_types?.map((type) => ChannelTypes[type])
            : option.channelTypes?.map((type) =>
                typeof type === "string" ? ChannelTypes[type] : type
              ) ??
              // When transforming to API data, accept API data
              option.channel_types,
        };
      };
      let cmdsList = [];
      Object.keys(commands).forEach((cmd) => {
        if (!commands[cmd].hidden && commands[cmd].description.length >= 1) {
          if (commands[cmd].interactions) {
            for (let i = 0; i < commands[cmd].interactions.length; i++) {
              let type = Math.max(
                1,
                interactionTypes.indexOf(commands[cmd].interactions[i]) + 1
              );
              let commandFormatted = {
                name: cmd,
                type,
                description:
                  type == 1
                    ? commands[cmd].description.replace(/\`/g, "")
                    : undefined,
                options:
                  commands[cmd].options && type == 1
                    ? commands[cmd].options.map((o) => {
                        o.type = optionTypes.indexOf(o.type) + 1;
                        return o;
                      })
                    : undefined,
              };
              cmdsList.push(commandFormatted);
            }
          } else {
            let commandFormatted = {
              name: cmd,
              description: commands[cmd].description.replace(/\`/g, ""),
              options: commands[cmd].options
                ? commands[cmd].options.map((o) => {
                    o.type = optionTypes.indexOf(o.type) + 1;
                    return o;
                  })
                : undefined,
            };
            cmdsList.push(commandFormatted);
          }
        }
      });
      client.application.commands.set(cmdsList);
    } catch (e) {
      console.log(e);
    }
  }
}

// Exports
module.exports = {
  findImage,
  sendImage,
  formatDuration,
  clamp,
  slashCommands: {
    init: slashCommandInit,
  },
};
