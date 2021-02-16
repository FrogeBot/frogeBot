require("dotenv").config();

const ytdl = require("ytdl-core");
const ytsr = require("ytsr");
var ytpl = require("ytpl");

const queue = new Map();

async function cmdFunc(msg, args, action) {
  const serverQueue = queue.get(msg.guild.id);
  if (action == "play") {
    execute(msg, serverQueue, args);
  } else if (action == "next") {
    skip(msg, serverQueue);
  } else if (action == "stop") {
    stop(msg, serverQueue);
  } else if (action == "disconnect") {
    disconnect(msg, msg.guild.id);
  } else if (action == "queue") {
    getQueue(msg, serverQueue, args);
  } else if (action == "nowPlaying") {
    nowPlaying(msg, serverQueue);
  } else if (action == "remove") {
    remove(msg, serverQueue, args);
  } else if (action == "shuffle") {
    shuffle(msg, serverQueue);
  }
}

async function execute(message, serverQueue, args) {
  try {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send({
        embed: {
          title: "Error",
          description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You need to be in a voice channel to play music`,
          color: Number(process.env.EMBED_COLOUR),
          timestamp: new Date(),
          author: {
            name: process.env.BOT_NAME,
            icon_url: message.client.user.displayAvatarURL(),
          },
        },
      });
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send({
        embed: {
          title: "Error",
          description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} ${process.env.BOT_NAME} lacks permissions to join and speak in your voice channel`,
          color: Number(process.env.EMBED_COLOUR),
          timestamp: new Date(),
          author: {
            name: process.env.BOT_NAME,
            icon_url: message.client.user.displayAvatarURL(),
          },
        },
      });
    }

    let results;

    let isPlaylist = ytpl.validateID(args);
    let isLinkOrId = ytdl.validateURL(args);

    let playlist;
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
      return message.channel.send({
        embed: {
          title: "Error",
          description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No videos found`,
          color: Number(process.env.EMBED_COLOUR),
          timestamp: new Date(),
          author: {
            name: process.env.BOT_NAME,
            icon_url: message.client.user.displayAvatarURL(),
          },
        },
      });
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
        message.channel.send({
          embed: {
            title: "Queued Playlist",
            description: `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`,
            color: Number(process.env.EMBED_COLOUR),
            timestamp: new Date(),
            author: {
              name: process.env.BOT_NAME,
              icon_url: message.client.user.displayAvatarURL(),
            },
          },
        });
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
        message.channel.send({
          embed: {
            title: "Queued Playlist",
            description: `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`,
            color: Number(process.env.EMBED_COLOUR),
            timestamp: new Date(),
            author: {
              name: process.env.BOT_NAME,
              icon_url: message.client.user.displayAvatarURL(),
            },
          },
        });
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
      return message.channel.send({
        embed: {
          title: "Queued Track",
          description: `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${song.title}](${song.url})** has been added to the queue`,
          color: Number(process.env.EMBED_COLOUR),
          timestamp: new Date(),
          author: {
            name: process.env.BOT_NAME,
            icon_url: message.client.user.displayAvatarURL(),
          },
          footer: {
            text: song.duration.durationFormat(),
          },
        },
      });
    }
  } catch (e) {
    console.log(e);
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} Something went wrong`,
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
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`,
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
  if (
    process.env.USE_MUSIC_ROLE != "true" ||
    message.member.roles.cache.find(
      (r) => r.name == process.env.MUSIC_ROLE_NAME
    ) != undefined ||
    serverQueue.voiceChannel.members.size <= 2
  ) {
    message.channel.send({
      embed: {
        title: `Stopping`,
        description: `<@${message.author.id}> - ${process.env.MSG_VIBING} Stopped music`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  } else {
    message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
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

function getQueue(message, serverQueue, args) {
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

    return message.channel.send({
      embed: {
        title: "Server Queue",
        description: `<@${message.author.id}> - ${
          process.env.MSG_VIBING
        }\n\`\`\`nim\n${songsMapped.join("\n")}\n\`\`\``,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
        footer: {
          text: `Page ${page + 1} of ${pages + 1} • ${
            serverQueue.songs.length
          } songs`,
        },
      },
    });
  }
}

function remove(message, serverQueue, args) {
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
  } else {
    if (
      args.length > 0 &&
      Number.isInteger(Number(args)) &&
      serverQueue.songs[Number(args) - 1] != undefined
    ) {
      if (Number(args) - 1 == 0) {
        return message.channel.send({
          embed: {
            title: "Unable to remove",
            description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You can't remove the currently playing song`,
            color: Number(process.env.EMBED_COLOUR),
            timestamp: new Date(),
            author: {
              name: process.env.BOT_NAME,
              icon_url: message.client.user.displayAvatarURL(),
            },
          },
        });
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
        return message.channel.send({
          embed: {
            title: "Removed",
            description: `<@${message.author.id}> - ${process.env.MSG_VIBING} Removed **[${song.title}](${song.url})** from the queue`,
            color: Number(process.env.EMBED_COLOUR),
            timestamp: new Date(),
            author: {
              name: process.env.BOT_NAME,
              icon_url: message.client.user.displayAvatarURL(),
            },
          },
        });
      } else {
        return message.channel.send({
          embed: {
            title: "Error",
            description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
            color: Number(process.env.EMBED_COLOUR),
            timestamp: new Date(),
            author: {
              name: process.env.BOT_NAME,
              icon_url: message.client.user.displayAvatarURL(),
            },
          },
        });
      }
    } else {
      return message.channel.send({
        embed: {
          title: "Error",
          description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} There is no song at that index`,
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
}

function shuffle(message, serverQueue) {
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
      return message.channel.send({
        embed: {
          title: "Shuffled",
          description: `<@${message.author.id}> - ${process.env.MSG_VIBING} Shuffled the music`,
          color: Number(process.env.EMBED_COLOUR),
          timestamp: new Date(),
          author: {
            name: process.env.BOT_NAME,
            icon_url: message.client.user.displayAvatarURL(),
          },
        },
      });
    } else {
      message.channel.send({
        embed: {
          title: "Error",
          description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
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

    serverQueue.textChannel.send({
      embed: {
        title: "Now Playing",
        description: `${process.env.MSG_VIBING} **[${song.title}](${song.url})**`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: guild.client.user.displayAvatarURL(),
        },
        footer: {
          text: song.duration.durationFormat(),
        },
      },
    });

    serverQueue.songs[0].startTime = Math.round(new Date().getTime() / 1000);
  } catch (e) {
    console.log(e);
  }
}

function nowPlaying(message, serverQueue) {
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

    serverQueue.textChannel.send({
      embed: {
        title: "Now Playing",
        description: `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${
          song.title
        }](${song.url})**\n \`\`\`nim\n[${(
          "―".repeat(elapsedBars) +
          "⬤" +
          "―".repeat(barLength - elapsedBars - 1)
        ).substr(0, barLength)}] -${remaining.durationFormat()}\n\`\`\``,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
        footer: {
          text: song.duration.durationFormat(),
        },
      },
    });
  } catch (e) {
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} Something went wrong`,
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

function disconnect(message, guildId) {
  let serverQueue = queue.get(guildId);
  if (!serverQueue) {
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
  if (!message.member.voice.channel) {
    return message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`,
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
    message.channel.send({
      embed: {
        title: "Disconnected",
        description: `<@${message.author.id}> - ${process.env.MSG_VIBING}`,
        color: Number(process.env.EMBED_COLOUR),
        timestamp: new Date(),
        author: {
          name: process.env.BOT_NAME,
          icon_url: message.client.user.displayAvatarURL(),
        },
      },
    });
  } else {
    message.channel.send({
      embed: {
        title: "Error",
        description: `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
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

Number.prototype.durationFormat = function () {
  if (this >= 3600) {
    return new Date(this * 1000).toISOString().substr(11, 8);
  } else {
    return new Date(this * 1000).toISOString().substr(14, 5);
  }
};

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
  cmdFunc,
};
