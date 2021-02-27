const ytdl = require("ytdl-core");
const ytsr = require("ytsr");
var ytpl = require("ytpl");

var { makeEmbed, playTrack, getPlaylist } = require("./utils");

async function execute(message, serverQueue, args) {
  try {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You need to be in a voice channel to play music`
        )
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} ${process.env.BOT_NAME} lacks permissions to join and speak in your voice channel`
        )
      );
    }

    let results;

    let isPlaylist = ytpl.validateID(args);
    let isLinkOrId = ytdl.validateURL(args);

    if (isLinkOrId) {
      results = {
        items: [
          {
            id: ytdl.getVideoID(args),
          },
        ],
      };
    } else if (!isPlaylist) {
      let filterUrl = (await ytsr.getFilters(args)).get("Type").get("Video")
        .url;
      results = await ytsr(filterUrl, { limit: 10 });
    }

    if (
      !isPlaylist &&
      (args.length == 0 ||
        (results.items && results.items.length == 0) ||
        (results.data && results.data.pageInfo.totalResults == 0))
    ) {
      return message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No videos found`
        )
      );
    }

    if (isPlaylist) {
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

        queue.set(message.guild.id, queueConstruct);

        let playlist = await getPlaylist(args, message.author.id);
        let playlistSongs = playlist.songs;
        message.channel.send(
          makeEmbed(
            "Queued Playlist",
            `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`
          )
        );
        for (let i = 0; i < playlistSongs.length; i++) {
          queueConstruct.songs.push(playlistSongs[i]);
          if (i == 0) {
            try {
              var connection = await voiceChannel.join();
              queueConstruct.connection = connection;
              playTrack(message.guild, queueConstruct.songs[0]);
            } catch (err) {
              console.log(err);
              queue.delete(message.guild.id);
              return message.channel.send(err);
            }
          }
        }
      } else {
        let playlist = await getPlaylist(args, message.author.id);
        let playlistSongs = playlist.songs;
        message.channel.send(
          makeEmbed(
            "Queued Playlist",
            `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`
          )
        );
        for (let i = 0; i < playlistSongs.length; i++) {
          serverQueue.songs.push(playlistSongs[i]);
          if (serverQueue.songs.length == 1) {
            playTrack(message.guild, serverQueue.songs[0]);
          }
        }
      }
      return;
    }

    const songInfo = await ytdl.getInfo(results.items[0].id);
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
      duration: Number(songInfo.videoDetails.lengthSeconds),
      user: message.author.id,
    };

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

      queue.set(message.guild.id, queueConstruct);

      queueConstruct.songs.push(song);

      try {
        var connection = await voiceChannel.join();
        queueConstruct.connection = connection;
        playTrack(message.guild, queueConstruct.songs[0]);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      if (serverQueue.songs.length == 1) {
        playTrack(message.guild, serverQueue.songs[0]);
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
  if (!message.member.voice.channel) {
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to skip`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
  }
  if (!serverQueue || serverQueue.songs.length == 0) {
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
  }
  if (message.member.voice.channel.id != serverQueue.voiceChannel.id) {
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
  }
  let sPercent = Number(process.env.SKIP_PERCENT);
  let members = serverQueue.voiceChannel.members.size - 1;
  let toSkip = Math.max(1, Math.ceil((members * sPercent) / 100));
  if (!serverQueue.skips) serverQueue.skips = 0;
  serverQueue.skips += 1;
  if (serverQueue.skips >= toSkip) {
    message.channel.send({
      embed: {
        title: `Skipped (${Math.round((members * sPercent) / 100)}/${Math.round(
          (members * sPercent) / 100
        )})`,
        description: `<@${message.author.id}> - ${process.env.MSG_VIBING} Skipped song`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
    serverQueue.connection.dispatcher.end();
  } else {
    message.channel.send({
      embed: {
        title: `Skipping (${serverQueue.skips}/${toSkip})`,
        description: `<@${message.author.id}> - ${process.env.MSG_VIBING} Skipped song`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
  }
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`
      )
    );
  }
  if (!serverQueue || serverQueue.songs.length == 0) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  }
  if (message.member.voice.channel.id != serverQueue.voiceChannel.id) {
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
  ) {
    message.channel.send(
      makeEmbed(
        "Stopping",
        `<@${message.author.id}> - ${process.env.MSG_VIBING} Stopped music`
      )
    );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  } else {
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
  if (!serverQueue) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  }
  if (!message.member.voice.channel) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`
      )
    );
  }
  if (message.member.voice.channel.id != serverQueue.voiceChannel.id) {
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
  ) {
    clearTimeout(serverQueue.leaveTimeout);
    serverQueue.voiceChannel.leave();
    queue.delete(guildId);
    message.channel.send(
      makeEmbed(
        "Disconnected",
        `<@${message.author.id}> - ${process.env.MSG_VIBING}`
      )
    );
  } else {
    message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
      )
    );
  }
}

function getQueue(message, serverQueue, args) {
  if (!serverQueue || serverQueue.songs.length == 0) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  } else {
    let perPage = 12;
    let pages = Math.floor(serverQueue.songs.length / perPage);

    let page =
      args.length > 0 &&
      Number.isInteger(Number(args)) &&
      Number(args) >= 1 &&
      Number(args) <= pages + 1
        ? Number(args) - 1
        : 0;

    let songsMapped = serverQueue.songs
      .map(
        (s, i) => `${i + 1}) ${s.title}  |  [${s.duration.durationFormat()}]`
      )
      .slice(perPage * page, perPage * (page + 1));

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
  if (!serverQueue || serverQueue.songs.length == 0) {
    return message.channel.send(
      makeEmbed(
        "Error",
        `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`
      )
    );
  }

  try {
    let song = serverQueue.songs[0];

    let remaining =
      song.startTime + song.duration - Math.round(new Date().getTime() / 1000);
    let elapsed = song.duration - remaining;

    let barLength = 30;

    let elapsedBars = Math.max(
      0,
      Math.round((elapsed / song.duration) * barLength) - 1
    );

    let bar = (
      "―".repeat(elapsedBars) +
      "⬤" +
      "―".repeat(barLength - elapsedBars - 1)
    ).substr(0, barLength);
    serverQueue.textChannel.send(
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
  if (!serverQueue || serverQueue.songs.length == 0) {
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
      if (Number(args) - 1 == 0) {
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
      ) {
        serverQueue.songs.splice(Number(args) - 1, 1);
        return message.channel.send(
          makeEmbed(
            "Removed",
            `<@${message.author.id}> - ${process.env.MSG_VIBING} Removed **[${song.title}](${song.url})** from the queue`
          )
        );
      } else {
        return message.channel.send(
          makeEmbed(
            "Error",
            `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
          )
        );
      }
    } else {
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
  if (!serverQueue || serverQueue.songs.length == 0) {
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
    ) {
      let shuffled = [serverQueue.songs[0]].concat(
        serverQueue.songs.slice(1).shuffle()
      );
      serverQueue.songs = shuffled;
      return message.channel.send(
        makeEmbed(
          "Shuffled",
          `<@${message.author.id}> - ${process.env.MSG_VIBING} Shuffled the music`
        )
      );
    } else {
      message.channel.send(
        makeEmbed(
          "Error",
          `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`
        )
      );
    }
  }
}

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