const ytdl = require("ytdl-core");
const ytsr = require("ytsr");
var ytpl = require("ytpl");

var { makeEmbed, playTrack, getPlaylist } = require("./utils"); // Require music utils

async function execute(message, serverQueue, args) {
  try {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) // If the user calling the command is not connected to vc
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You need to be in a voice channel to play music`
        )
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) { // If the bot lacks either connect or speak perms
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} ${process.env.BOT_NAME} lacks permissions to join and speak in your voice channel`
        )
      );
    }

    let results;

    let isPlaylist = ytpl.validateID(args); // Check if the query is a playlist link/id
    let isLinkOrId = ytdl.validateURL(args); // Check if the query is a video link/id

    if (isLinkOrId) { // If video
      results = { // This object just mimics the response given by the search module so that the same code can be used for both
        items: [
          {
            id: ytdl.getVideoID(args), // Get video form id
          },
        ],
      };
    } else if (!isPlaylist) { // If the query is not a link or id to either video or playlist
      let filterUrl = (await ytsr.getFilters(args)).get("Type").get("Video")
        .url;
      results = await ytsr(filterUrl, { limit: 1 });
    } // Get the first video result for the search query

    if (
      !isPlaylist &&
      (args.length == 0 ||
        (results.items && results.items.length == 0) ||
        (results.data && results.data.pageInfo.totalResults == 0))
    ) { // If no videos could be found
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No videos found`
        )
      );
    }

    if (isPlaylist) { // If is a playlist
      if (!serverQueue) {
        const queueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
          leaveTimeout: null,
        };

        queue.set(message.guild.id, queueConstruct); // Initialise server queue if it doesn't exist

        let playlist = await getPlaylist(args, message.author.id); // Get the playlist as an object
        let playlistSongs = playlist.songs;
        message.channel.send(
          makeEmbed(
            "Queued Playlist",
            `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`
          )
        );
        for (let i = 0; i < playlistSongs.length; i++) { // Loop throught the songs adding them to the queue
          queueConstruct.songs.push(playlistSongs[i]);
          if (i == 0) { // If it is the first song
            try {
              var connection = await voiceChannel.join(); // Join vc
              queueConstruct.connection = connection;
              playTrack(message.guild, queueConstruct.songs[0]); // Attempt to play the song
            } catch (err) {
              console.log(err);
              queue.delete(message.guild.id);
              return message.channel.send(err);
            }
          }
        }
      } else {
        let playlist = await getPlaylist(args, message.author.id); // Get the playlist as an object
        let playlistSongs = playlist.songs;
        message.channel.send(
          makeEmbed(
            "Queued Playlist",
            `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`
          )
        );
        for (let i = 0; i < playlistSongs.length; i++) { // Loop throught the songs adding them to the queue
          serverQueue.songs.push(playlistSongs[i]);
          if (serverQueue.songs.length == 1) { // If the song being added means that the queue now only has one song (first in queue and nothing playing)
            playTrack(message.guild, serverQueue.songs[0]); // Attempt to play the song
          }
        }
      }
      return;
    }

    // If not a playlist
    const songInfo = await ytdl.getInfo(results.items[0].id); // Get video details
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
      duration: Number(songInfo.videoDetails.lengthSeconds),
      user: message.author.id,
    }; // Map to song object

    if (!serverQueue) {
      const queueConstruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
        leaveTimeout: null,
      };

      queue.set(message.guild.id, queueConstruct); // Initialise server queue if it doesn't exist

      queueConstruct.songs.push(song); // Add song to queue

      try {
        var connection = await voiceChannel.join(); // Join vc
        queueConstruct.connection = connection;
        playTrack(message.guild, queueConstruct.songs[0]); // Attempt to play the song
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      if (serverQueue.songs.length == 1) { // If the song being added means that the queue now only has one song (first in queue and nothing playing)
        playTrack(message.guild, serverQueue.songs[0]); // Attempt to play the song
      }

      return message.channel.send(
        makeEmbed(
          "Queued Track",
          `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${song.title}](${song.url})** has been added to the queue`,
          song.duration.durationFormat()
        )
      );
    }
  } catch (e) {
    console.log(e);

    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} Something went wrong`
      )
    );
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel) { // If the user calling the command is not connected to vc
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to skip`,
      )
    );
  }
  if (!serverQueue || serverQueue.songs.length == 0) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
      )
    );
  }
  if (message.member.voice.channel.id != serverQueue.voiceChannel.id) { // If the voice channels don't match
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`
      )
    );
  }
  let sPercent = Number(process.env.SKIP_PERCENT); // Get the percent needed to skip
  let members = serverQueue.voiceChannel.members.size - 1; // Get the number of people in the vc
  let toSkip = Math.max(1, Math.ceil((members * sPercent) / 100)); // Work out the number required to skip (min 1)
  if (!serverQueue.skips) serverQueue.skips = 0; // If by some anomaly, the skips value isn't defined, fix it
  serverQueue.skips += 1; // Add 1 to skips
  if (serverQueue.skips >= toSkip) { // If enough skips votes are cast
    message.channel.send(
      makeEmbed(
        `Skipped (${toSkip}/${toSkip})`,
        `<@${message.author.id}> - ${process.env.MSG_VIBING} Skipped song`
      )
    );
    serverQueue.connection.dispatcher.end(); // End track playback early, will attempt to play the next song due to the end handler
  } else { // If not enough skip votes have been cast
    message.channel.send(
      makeEmbed(
        `Skipping (${serverQueue.skips}/${toSkip})`,
        `<@${message.author.id}> - ${process.env.MSG_VIBING} ${toSkip-serverQueue.skips} more skip${(toSkip-serverQueue.skips>1)?"s":""} required`
      )
    );
  }
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) { // If the user calling the command is not connected to vc
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`
      )
    );
  }
  if (!serverQueue || serverQueue.songs.length == 0) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  }
  if (message.member.voice.channel.id != serverQueue.voiceChannel.id) { // If the voice channels don't match
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`
      )
    );
  }
  if (
    process.env.USE_MUSIC_ROLE != "true" ||
    message.member.roles.cache.find(
      (r) => r.name == process.env.MUSIC_ROLE_NAME
    ) != undefined ||
    serverQueue.voiceChannel.members.size <= 2
  ) { // Check conditions for disconnecting the bot (DJ role is disabled, has DJ role, no songs in queue, only 1 listener)
    message.channel.send(
      makeEmbed(
        "Stopping",
        `<@${message.author.id}> - ${process.env.MSG_VIBING} Stopped music`
      )
    );
    serverQueue.songs = []; // Clear queue
    serverQueue.connection.dispatcher.end(); // End playback
  } else { // If none of the other conditions are met, tell them they lack the DJ role
    message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
      )
    );
  }
}

function disconnect(message, guildId) {
  let serverQueue = queue.get(guildId);
  if (!serverQueue) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  }
  if (!message.member.voice.channel) { // If the user calling the command is not connected to vc
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`
      )
    );
  }
  if (message.member.voice.channel.id != serverQueue.voiceChannel.id) { // If the voice channels don't match
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`
      )
    );
  }
  if (
    process.env.USE_MUSIC_ROLE != "true" ||
    message.member.roles.cache.find(
      (r) => r.name == process.env.MUSIC_ROLE_NAME
    ) != undefined ||
    serverQueue.songs.length == 0 ||
    serverQueue.voiceChannel.members.size <= 2
  ) { // Check conditions for disconnecting the bot (DJ role is disabled, has DJ role, no songs in queue, only 1 listener)
    clearTimeout(serverQueue.leaveTimeout); // Clear leave timeout
    serverQueue.voiceChannel.leave(); // Leave now
    queue.delete(guildId); // Delete queue object
    message.channel.send(
      makeEmbed(
        "Disconnected",
        `<@${message.author.id}> - ${process.env.MSG_VIBING}`
      )
    );
  } else { // If none of the other conditions are met, tell them they lack the DJ role
    message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
      )
    );
  }
}

function getQueue(message, serverQueue, args) {
  if (!serverQueue || serverQueue.songs.length == 0) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  } else {
    let perPage = 12; // Amount of songs to show per page
    let pages = Math.floor(serverQueue.songs.length / perPage); // Amount of pages there are

    let page =
      args.length > 0 &&
      Number.isInteger(Number(args)) &&
      Number(args) >= 1 &&
      Number(args) <= pages + 1
        ? Number(args) - 1
        : 0; // Calculate page to show

    let songsMapped = serverQueue.songs
      .map(
        (s, i) => `${i + 1}) ${s.title}  |  [${s.duration.durationFormat()}]`
      ) // Songs to readable format
      .slice(perPage * page, perPage * (page + 1)); // Limit to only the page requestd

    // Send the queue
    return message.channel.send(
      makeEmbed(
        "Server Queue",
        `<@${message.author.id}> - ${
          process.env.MSG_VIBING
        }\n\`\`\`nim\n${songsMapped.join("\n")}\n\`\`\``,
        `Page ${page + 1} of ${pages + 1} • ${serverQueue.songs.length} songs`
      )
    );
  }
}

function nowPlaying(message, serverQueue) {
  if (!serverQueue || serverQueue.songs.length == 0) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  }

  try {
    let song = serverQueue.songs[0]; // Get currently playing song

    let remaining =
      song.startTime + song.duration - Math.round(new Date().getTime() / 1000); // Get time remaining by subtracting current time from expected end time
    let elapsed = song.duration - remaining; // Work out elapsed time

    let barLength = 30; // Length of duration bar

    let elapsedBars = Math.max(
      0,
      Math.round((elapsed / song.duration) * barLength) - 1
    ); // Number of bar characters before the dot

    let bar = (
      "―".repeat(elapsedBars) +
      "⬤" +
      "―".repeat(barLength - elapsedBars - 1)
    ).substr(0, barLength); // Generate bar string
    message.channel.send(
      makeEmbed(
        "Now Playing",
        `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${
          song.title
        }](${
          song.url
        })**\n \`\`\`nim\n[${bar}] -${remaining.durationFormat()}\n\`\`\``
      )
    );
  } catch (e) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} Something went wrong`
      )
    );
  }
}

function remove(message, serverQueue, args) {
  if (!serverQueue || serverQueue.songs.length == 0) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  } else {
    if (
      args.length > 0 &&
      Number.isInteger(Number(args)) &&
      serverQueue.songs[Number(args) - 1] != undefined
    ) {
      if (Number(args) - 1 == 0) { // If attempted to remove currently playing song
        return message.channel.send(
          makeEmbed(
            "Unable to remove",
            `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You can't remove the currently playing song`
          )
        );
      }
      let song = serverQueue.songs[Number(args) - 1];
      if (
        process.env.USE_MUSIC_ROLE != "true" ||
        message.member.roles.cache.find(
          (r) => r.name == process.env.MUSIC_ROLE_NAME
        ) != undefined ||
        song.user == message.author.id ||
        serverQueue.voiceChannel.members.size <= 2
      ) { // Check conditions for disconnecting the bot (DJ role is disabled, has DJ role, no songs in queue, only 1 listener)
        serverQueue.songs.splice(Number(args) - 1, 1); // Remove the song from the queue
        return message.channel.send(
          makeEmbed(
            "Removed",
            `<@${message.author.id}> - ${process.env.MSG_VIBING} Removed **[${song.title}](${song.url})** from the queue`
          )
        );
      } else { // If none of the other conditions are met, tell them they lack the DJ role
        return message.channel.send(
          makeEmbed(
            "Error",
            `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
          )
        );
      }
    } else { // If no song is found at the index supplied, or no index supplied
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} There is no song at that index`
        )
      );
    }
  }
}

function shuffle(message, serverQueue) {
  if (!serverQueue || serverQueue.songs.length == 0) { // If no music is playing
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  } else {
    if (
      process.env.USE_MUSIC_ROLE != "true" ||
      message.member.roles.cache.find(
        (r) => r.name == process.env.MUSIC_ROLE_NAME
      ) != undefined ||
      serverQueue.voiceChannel.members.size <= 2
    ) { // Check conditions for disconnecting the bot (DJ role is disabled, has DJ role, no songs in queue, only 1 listener)
      let shuffled = [serverQueue.songs[0]].concat(
        serverQueue.songs.slice(1).shuffle()
      ); // Shuffle the queue but keep the first item in the same place because it's the currently playing track
      serverQueue.songs = shuffled; // Apply the shuffled queue
      return message.channel.send(
        makeEmbed(
          "Shuffled",
          `<@${message.author.id}> - ${process.env.MSG_VIBING} Shuffled the music`
        )
      );
    } else { // If none of the other conditions are met, tell them they lack the DJ role
      message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
        )
      );
    }
  }
}

// Exports
module.exports = {
  execute,
  skip,
  stop,
  disconnect,
  getQueue,
  nowPlaying,
  remove,
  shuffle
}