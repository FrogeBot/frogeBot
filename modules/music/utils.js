const ytdl = require("ytdl-core");
var ytpl = require("ytpl");

// Shorthand embed function
function makeEmbed(title, description, footerText) {
  return {
    embed: {
      title,
      description,
      color: Number(process.env.EMBED_COLOUR),
      timestamp: new Date(),
      author: {
        name: process.env.BOT_NAME,
        icon_url: client.user.displayAvatarURL(),
      },
      footer: {
        text: footerText,
      },
    },
  };
}

function playTrack(guild, song) {
  let serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.leaveTimeout = setTimeout(() => {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
    }, 120000);
    return;
  }

  serverQueue.skips = 0;

  clearTimeout(serverQueue.leaveTimeout);

  try {
    const dispatcher = serverQueue.connection
      .play(ytdl(song.url, { filter: "audio", quality: "lowestaudio" }), {
        bitrate: "auto",
      })
      .on("finish", () => {
        serverQueue.songs.shift();
        playTrack(guild, serverQueue.songs[0]);
      })
      .on("error", (error) => {
        console.error(error);
        serverQueue.songs.shift();
        playTrack(guild, serverQueue.songs[0]);
      })
      .on("failed", (error) => {
        console.error(error);
      });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

    serverQueue.textChannel.send(
      makeEmbed(
        "Now Playing",
        `${process.env.MSG_VIBING} **[${song.title}](${song.url})**`,
        song.duration.durationFormat()
      )
    );

    serverQueue.songs[0].startTime = Math.round(new Date().getTime() / 1000);
  } catch (e) {
    console.log(e);
  }
}

async function getPlaylist(args, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      const results = await ytpl(await ytpl.getPlaylistID(args), {
        limit: Infinity,
      });
      let songs = results.items.map((v) => {
        return {
          title: v.title,
          url: v.url,
          duration: v.durationSec,
          userId,
        };
      });
      resolve({
        title: results.title,
        id: results.id,
        songs,
      });
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  makeEmbed,
  playTrack,
  getPlaylist
}

// Array shuffle function
Array.prototype.shuffle = function () {
  let array = this.slice(0);

  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};