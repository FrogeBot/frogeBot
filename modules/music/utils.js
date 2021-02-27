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
  if (!song) { // If song is undefined, stop the music in 2 minutes
    serverQueue.leaveTimeout = setTimeout(() => {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
    }, 120000);
    return;
  }

  // Reset skips when the next song is played
  serverQueue.skips = 0;

  clearTimeout(serverQueue.leaveTimeout); // Cancel leave timeout

  try {
    const dispatcher = serverQueue.connection
      .play(ytdl(song.url, { filter: "audio" }), { // Play YouTube audio in vc
        bitrate: "auto",
      })
      .on("finish", () => { // When playback finishes, call the function again to try and play the next song
        serverQueue.songs.shift();
        playTrack(guild, serverQueue.songs[0]);
      })
      .on("error", (error) => { // When playback has an error, call the function again to try and play the next song
        console.error(error);
        serverQueue.songs.shift();
        playTrack(guild, serverQueue.songs[0]);
      })
      .on("failed", (error) => { // When starting playback fails, log the error
        console.error(error);
      });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5); // Set the volume

    serverQueue.textChannel.send(
      makeEmbed(
        "Now Playing",
        `${process.env.MSG_VIBING} **[${song.title}](${song.url})**`,
        song.duration.durationFormat()
      )
    ); // Send a message saying that the song is now playing

    serverQueue.songs[0].startTime = Math.round(new Date().getTime() / 1000); // Set start time of song (used in nowPlaying)
  } catch (e) {
    console.log(e);
  }
}

// Function to convert from playlist ID to playlist object with array of parsed song objects
async function getPlaylist(args, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get playlist from YouTube
      const results = await ytpl(await ytpl.getPlaylistID(args), {
        limit: Infinity,
      });
      // Map videos to "songs"
      let songs = results.items.map((v) => {
        return {
          title: v.title,
          url: v.url,
          duration: v.durationSec,
          userId,
        };
      });
      // Resolve playlist object
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

// Exports
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