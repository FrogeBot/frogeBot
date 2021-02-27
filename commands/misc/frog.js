require("dotenv").config()

const request = require("request")

async function cmdFunc(msg, args, startTime) {
    let frogUrl = "https://www.reddit.com/r/frogs.json"; // Subreddit JSON url
    request(frogUrl, function(error, response, body){ // Request response
        if (error) // Send an error message if the request fails
            msg.channel.send({
                embed: {
                    "title": "Error",
                    "description": `<@${msg.author.id}> - ${process.env.MSG_SEND_FAIL}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    }
                }
            })
        else {
            let frogJSON = JSON.parse(response.body) // Parse JSON of response
            
            let frogImages = frogJSON.data.children.filter(f => (!f.data.over_18 && f.data.url.startsWith("https://i.redd.it"))) // Filter JSON to only include images that aren't NSFW

            let randomFrog = frogImages[Math.floor(Math.random()*frogImages.length)]; // Get random image

            // Send image
            msg.channel.send({
                embed: {
                    "title": "Frog",
                    "description": `<@${msg.author.id}> ${process.env.MSG_SUCCESS}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    },
                    "footer": {
                        "text": "mmmm myes pet froge"
                    },
                    "image": {
                        "url": randomFrog.data.url
                    }
                }
            })
        }
    });
}

module.exports = {
    cmdFunc
}