require("dotenv").config()

const ytdl = require("ytdl-core");

const queue = new Map();

const { google } = require("googleapis");
let Youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

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
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You need to be in a voice channel to play music`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} ${process.env.BOT_NAME} lacks permissions to join and speak in your voice channel`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        }

        let results;

        let isPlaylist = args.match(/https?:\/\/www.youtube.com\/playlist\?list=(.+)/);
        let isLinkOrId = ytdl.validateURL(args);

        let playlist;
        if(isPlaylist) {
                playlist = (await Youtube.playlists.list({
                    part: 'snippet',
                    id: args.replace(/https?:\/\/www.youtube.com\/playlist\?list=(.+)/, '$1')
                })).data.items[0].snippet
                results = await getPlaylistVideos(args.replace(/https?:\/\/www.youtube.com\/playlist\?list=(.+)/, '$1'))
        } else if(isLinkOrId) {
            results = {
                data: {
                    pageInfo: {
                        totalResults: 1
                    },
                    items: [
                        {
                            id: {
                                videoId: ytdl.getVideoID(args)
                            },
                            contentDetails: {
                                videoId: ytdl.getVideoID(args)
                            }
                        }
                    ]
                        
                }
            }
        } else {
            results = await Youtube.search.list({
                part: 'snippet',
                type: 'video',
                q: args
            });
        }

        if(args.length == 0 || results.data.pageInfo.totalResults == 0) {
            return message.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No videos found`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        }

        if(isPlaylist) {
            if (!serverQueue) {
                const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
                leaveTimeout: null
                };
            
                queue.set(message.guild.id, queueConstruct);

                let qMessage;
                for (let i = 0; i < results.data.items.length; i++) {
                    const songInfo = await ytdl.getInfo(results.data.items[i].contentDetails.videoId);
                    const song = {
                        title: songInfo.videoDetails.title,
                        url: songInfo.videoDetails.video_url,
                        duration: Number(songInfo.videoDetails.lengthSeconds)
                    };
                    queueConstruct.songs.push(song)
                    if(i == 0) {
                        try {
                            var connection = await voiceChannel.join();
                            queueConstruct.connection = connection;
                            qMessage = await message.channel.send({
                                embed: {
                                    "title": "Queuing Playlist",
                                    "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** is being added to the queue. (It may take a minute for all songs to be added)`,
                                    "color": Number(process.env.EMBED_COLOUR),
                                    "timestamp": new Date(),
                                    "author": {
                                        "name": process.env.BOT_NAME,
                                        "icon_url": message.client.user.displayAvatarURL()
                                    }
                                }
                            });
                            playTrack(message.guild, queueConstruct.songs[0]);
                        } catch (err) {
                            console.log(err);
                            queue.delete(message.guild.id);
                            return message.channel.send(err);
                        }
                    }
                }
                if(qMessage) {
                    qMessage.edit({
                        embed: {
                            "title": "Queued Playlist",
                            "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue.`,
                            "color": Number(process.env.EMBED_COLOUR),
                            "timestamp": new Date(),
                            "author": {
                                "name": process.env.BOT_NAME,
                                "icon_url": message.client.user.displayAvatarURL()
                            }
                        }
                    });
                }
            } else {
                for (let i = 0; i < results.data.items.length; i++) {
                    const songInfo = await ytdl.getInfo(results.data.items[i].contentDetails.videoId);
                    const song = {
                        title: songInfo.videoDetails.title,
                        url: songInfo.videoDetails.video_url,
                        duration: Number(songInfo.videoDetails.lengthSeconds)
                    };
                    serverQueue.songs.push(song)
                    if(i == 0) {
                        message.channel.send({
                            embed: {
                                "title": "Queued Playlist",
                                "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${playlist.title}](https://www.youtube.com/playlist?list=${playlist.id})** has been added to the queue`,
                                "color": Number(process.env.EMBED_COLOUR),
                                "timestamp": new Date(),
                                "author": {
                                    "name": process.env.BOT_NAME,
                                    "icon_url": message.client.user.displayAvatarURL()
                                },
                                "footer": {
                                    "text": song.duration.durationFormat()
                                }
                            }
                        });
                        if(serverQueue.songs.length == 1) playTrack(message.guild, serverQueue.songs[0]);
                    }
                }
            }
            return
        }

        const songInfo = await ytdl.getInfo(results.data.items[0].id.videoId);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            duration: Number(songInfo.videoDetails.lengthSeconds),
            user: message.author.id
        };
    
        if (!serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
                leaveTimeout: null
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
            if(serverQueue.songs.length == 1) {
                playTrack(message.guild, serverQueue.songs[0]);
            }
            return message.channel.send({
                embed: {
                    "title": "Queued Track",
                    "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${song.title}](${song.url})** has been added to the queue`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    },
                    "footer": {
                        "text": song.duration.durationFormat()
                    }
                }
            });
        }
    } catch(e) {
        if(e.errors && e.errors[0].reason == 'quotaExceeded') {
            return message.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} YouTube Data API v3 quota exceeded. You can still play video links.`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        } else {
            return message.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} Something went wrong`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        }
    }
}
  
function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to skip`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if (message.member.voice.channel.id != serverQueue.voiceChannel.id) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    let sPercent = Number(process.env.SKIP_PERCENT);
    let members = serverQueue.voiceChannel.members.size-1
    let toSkip = Math.max(1, Math.ceil(members*sPercent/100));
    if(!serverQueue.skips) serverQueue.skips = 0;
    serverQueue.skips += 1;
    if(serverQueue.skips >= toSkip) {
        message.channel.send({
            embed: {
                "title": `Skipped (${Math.round(members*sPercent/100)}/${Math.round(members*sPercent/100)})`,
                "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} Skipped song`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        })
        serverQueue.connection.dispatcher.end();
    } else {
        message.channel.send({
            embed: {
                "title": `Skipping (${serverQueue.skips}/${toSkip})`,
                "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} Skipped song`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        })
    }
}
  
function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if (message.member.voice.channel.id != serverQueue.voiceChannel.id) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if(process.env.USE_MUSIC_ROLE != "true" || message.member.roles.cache.find(r => r.name == process.env.MUSIC_ROLE_NAME) != undefined) {
        message.channel.send({
            embed: {
                "title": `Stopping`,
                "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} Stopped music`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        })
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    } else {
        message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
  }

function getQueue(message, serverQueue, args) {
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    } else {
        let perPage = 12
        let pages = Math.floor(serverQueue.songs.length/perPage)

        let page = (args.length > 0 && Number.isInteger(Number(args)) && Number(args) >= 1 && Number(args) <= pages+1) ? Number(args)-1 : 0;

        let songsMapped = serverQueue.songs.map((s, i) => `${i+1}) ${s.title}  |  [${s.duration.durationFormat()}]` ).slice(perPage*page, perPage*(page+1));

        return message.channel.send({
            embed: {
                "title": "Server Queue",
                "description": `<@${message.author.id}> - ${process.env.MSG_VIBING}\n\`\`\`nim\n${songsMapped.join("\n")}\n\`\`\``,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                },
                "footer": {
                    "text": `Page ${page+1} of ${pages+1} • ${serverQueue.songs.length} songs`
                }
            }
        });
    }
  }
  
function remove(message, serverQueue, args) {
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    } else {
        if(args.length > 0 && Number.isInteger(Number(args)) && serverQueue.songs[Number(args)-1] != undefined) {
            if(Number(args)-1 == 0) {
                return message.channel.send({
                    embed: {
                        "title": "Unable to remove",
                        "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You can't remove the currently playing song`,
                        "color": Number(process.env.EMBED_COLOUR),
                        "timestamp": new Date(),
                        "author": {
                            "name": process.env.BOT_NAME,
                            "icon_url": message.client.user.displayAvatarURL()
                        }
                    }
                });
            }
            let song = serverQueue.songs[Number(args)-1];
            if(process.env.USE_MUSIC_ROLE != "true" || message.member.roles.cache.find(r => r.name == process.env.MUSIC_ROLE_NAME) != undefined || song.user == message.author.id) {
                serverQueue.songs.splice(Number(args)-1, 1);
                return message.channel.send({
                    embed: {
                        "title": "Removed",
                        "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} Removed **[${song.title}](${song.url})** from the queue`,
                        "color": Number(process.env.EMBED_COLOUR),
                        "timestamp": new Date(),
                        "author": {
                            "name": process.env.BOT_NAME,
                            "icon_url": message.client.user.displayAvatarURL()
                        }
                    }
                });
            } else {
                return message.channel.send({
                    embed: {
                        "title": "Error",
                        "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
                        "color": Number(process.env.EMBED_COLOUR),
                        "timestamp": new Date(),
                        "author": {
                            "name": process.env.BOT_NAME,
                            "icon_url": message.client.user.displayAvatarURL()
                        }
                    }
                });
            }
        } else {
            return message.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} There is no song at that index`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        }
    }
}

function shuffle(message, serverQueue) {
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    } else {
        if(process.env.USE_MUSIC_ROLE != "true" || message.member.roles.cache.find(r => r.name == process.env.MUSIC_ROLE_NAME) != undefined) {
            let shuffled = [serverQueue.songs[0]].concat(serverQueue.songs.slice(1).shuffle());
            serverQueue.songs = shuffled;
            return message.channel.send({
                embed: {
                    "title": "Shuffled",
                    "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} Shuffled the music`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
            });
        } else {
            message.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": message.client.user.displayAvatarURL()
                    }
                }
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
        }, 120000)
        return;
    }

    serverQueue.skips = 0;

    clearTimeout(serverQueue.leaveTimeout)
    
    const dispatcher = serverQueue.connection
      .play(ytdl(song.url, {filter: "audio"}))
      .on("finish", () => {
        serverQueue.songs.shift();
        playTrack(guild, serverQueue.songs[0]);
      })
      .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    
    serverQueue.textChannel.send({
        embed: {
            "title": "Now Playing",
            "description": `${process.env.MSG_VIBING} **[${song.title}](${song.url})**`,
            "color": Number(process.env.EMBED_COLOUR),
            "timestamp": new Date(),
            "author": {
                "name": process.env.BOT_NAME,
                "icon_url": guild.client.user.displayAvatarURL()
            },
            "footer": {
                "text": song.duration.durationFormat()
            }
        }
    });
    
    serverQueue.songs[0].startTime = Math.round(new Date().getTime()/1000);
}

function nowPlaying(message, serverQueue) {
    if (!serverQueue || serverQueue.songs.length == 0) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }

    let song = serverQueue.songs[0]

    let remaining = song.startTime+song.duration-Math.round(new Date().getTime()/1000);
    let elapsed = song.duration-remaining;

    let barLength = 30;

    let elapsedBars = Math.max(0, Math.round(elapsed/song.duration*barLength)-1)

    serverQueue.textChannel.send({
        embed: {
            "title": "Now Playing",
            "description": `<@${message.author.id}> - ${process.env.MSG_VIBING} **[${song.title}](${song.url})**\n \`\`\`nim\n[${('―'.repeat(elapsedBars)+'⬤'+'―'.repeat(barLength-elapsedBars-1)).substr(0,barLength)}] -${remaining.durationFormat()}\n\`\`\``,
            "color": Number(process.env.EMBED_COLOUR),
            "timestamp": new Date(),
            "author": {
                "name": process.env.BOT_NAME,
                "icon_url": message.client.user.displayAvatarURL()
            },
            "footer": {
                "text": song.duration.durationFormat()
            }
        }
    });
}

function disconnect(message, guildId) {
    let serverQueue = queue.get(guildId);
    if (!serverQueue) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} No music is playing this server`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if (!message.member.voice.channel) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You have to be in a voice channel to stop the music`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if (message.member.voice.channel.id != serverQueue.voiceChannel.id) {
        return message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You're not in the same voice channel as the bot`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
    if(process.env.USE_MUSIC_ROLE != "true" || message.member.roles.cache.find(r => r.name == process.env.MUSIC_ROLE_NAME) != undefined || serverQueue.songs.length == 0) {
        clearTimeout(serverQueue.leaveTimeout)
        serverQueue.voiceChannel.leave();
        queue.delete(guildId);
        message.channel.send({
            embed: {
                "title": "Disconnected",
                "description": `<@${message.author.id}> - ${process.env.MSG_VIBING}`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        })
    } else {
        message.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${message.author.id}> - ${process.env.MSG_UNVIBING} You don't have the **${process.env.MUSIC_ROLE_NAME}** role`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": message.client.user.displayAvatarURL()
                }
            }
        });
    }
}

Number.prototype.durationFormat = function() {
    if(this >= 3600) {
        return new Date(this * 1000).toISOString().substr(11, 8)
    } else {
        return new Date(this * 1000).toISOString().substr(14, 5)
    }
}

Array.prototype.shuffle = function() {
    let array = this.slice(0);

    var currentIndex = array.length, temporaryValue, randomIndex;
  
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
  }

async function getPlaylistVideos(playlistId, pageToken) {
    return new Promise(async (resolve, reject) => {
        try {
            let results = await Youtube.playlistItems.list({
                part: 'contentDetails',
                playlistId,
                maxResults: 50,
                pageToken
            })
            let items = results.data.items;
            if(results.data.nextPageToken) {
                let newResults = await getPlaylistVideos(playlistId, results.data.nextPageToken)
                items = items.concat(newResults.data.items)
                results.data.items = items
            }
            resolve(results)
        } catch(e) {
            reject(e)
        }
    })
}

module.exports = {
    cmdFunc
}