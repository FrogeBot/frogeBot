require("dotenv").config()

const request = require("request")

async function cmdFunc(msg, args, startTime) {
    let dogUrl = "https://www.reddit.com/r/DOG.json"; // Subreddit JSON url
    request(dogUrl, function(error, response, body){ // Request response
        if (error) // Send an error message if the request fails
            msg.reply({
                embeds: [{
                    "title": "Error",
                    "description": `<@${msg.member.id}> - ${process.env.MSG_SEND_FAIL}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    }
                }]
            })
        else {
            let dogJSON = JSON.parse(response.body) // Parse JSON of response
            
            let dogImages = dogJSON.data.children.filter(f => (!f.data.over_18 && f.data.url.startsWith("https://i.redd.it"))) // Filter JSON to only include images that aren't NSFW

            let randomDog = dogImages[Math.floor(Math.random()*dogImages.length)]; // Get random image

            // Send image
            msg.reply({
                embeds: [{
                    "title": "Dog",
                    "description": `<@${msg.member.id}> ${process.env.MSG_SUCCESS}`,
                    "color": Number(process.env.EMBED_COLOUR),
                    "timestamp": new Date(),
                    "author": {
                        "name": process.env.BOT_NAME,
                        "icon_url": msg.client.user.displayAvatarURL()
                    },
                    "footer": {
                        "text": "Dog :("
                    },
                    "image": {
                        "url": randomDog.data.url
                    }
                }]
            })
        }
    });
}

module.exports = {
    cmdFunc
}