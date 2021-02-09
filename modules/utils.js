function findImage(msg) {
    return new Promise(async (resolve, reject) => {
        try {
            if(msg.attachments.size > 0) { // If message has image attachment
                let imgUrl = await msg.attachments.first()
                resolve(imgUrl.proxyURL) // Resolve image URL
            } else if(msg.embeds[0] && msg.embeds[0].type == "image") { // If message has image embed
                let imgUrl = msg.embeds[0].url
                resolve(imgUrl) // Resolve image URL
            } else { // Channel searching (25 messages)
                let messages = await msg.channel.messages.fetch({ limit: 25 })
                let attachmentMessages = messages.map(message => {
                    let attachmentURL = undefined
                    if(message.attachments.first()) {
                        attachmentURL = message.attachments.first().proxyURL; // If message has image attachment set as URL
                    } else {
                        if(message.embeds[0] && message.embeds[0].type == "image") {
                            attachmentURL = message.embeds[0].url // If message has image embed set as URL
                        }
                        if(message.embeds[0] && message.embeds[0].type == "gifv") {
                            attachmentURL = message.embeds[0].url+(message.embeds[0].url.match(/(\.gif)/gi) ? "" : ".gif") // If message has gifv embed set as URL (Ensuring it ends with .gif)
                        }
                        if(message.embeds[0] && message.embeds[0].image != null) {
                            attachmentURL = message.embeds[0].image.proxyURL // If message is an embed with an image
                        }
                    }
                    if(attachmentURL) return attachmentURL // Return image URL for each message
                }).filter(a => a != undefined); // Filter out messages with no image
                if(attachmentMessages[0]) {
                    resolve(attachmentMessages[0]) // Resolve image URL
                } else {
                    reject()
                }
            }
        } catch(e) {
            reject(e)
        }
    })
}

const timeVals = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000
}
function formatDuration(millis) {
    let str = [];
    switch(true) {
        case millis >= timeVals.day:
            str.push(Math.floor(millis/timeVals.day) + "d")
            millis = millis%timeVals.day
        case millis >= timeVals.hour:
            str.push(Math.floor(millis/timeVals.hour) + "h")
            millis = millis%timeVals.hour
        case millis >= timeVals.minute:
            str.push(Math.floor(millis/timeVals.minute) + "m")
            millis = millis%timeVals.minute
        default:
            str.push(millis/timeVals.second + "s")
        
    }
    return str.join(" ")
}

function clamp(input, min, max) {
    return Math.min(Math.max(input, min), max);
};

// Exports
module.exports = {
    findImage,
    formatDuration,
    clamp
}