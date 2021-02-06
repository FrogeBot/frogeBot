function findImage(msg) {
    return new Promise(async (resolve, reject) => {
        try {
            if(msg.attachments.size > 0) {
                let imgUrl = await msg.attachments.first()
                resolve(imgUrl.proxyURL)
            } else if(msg.embeds[0] && msg.embeds[0].type == "image") {
                let imgUrl = msg.embeds[0].url
                resolve(imgUrl)
            } else {
                // Add channel searching (go back 20 or 25 messages)
                let messages = await msg.channel.messages.fetch({ limit: 25 })
                let attachmentMessages = messages.map(message => {
                    let attachmentURL = undefined
                    if(message.attachments.first()) {
                        attachmentURL = message.attachments.first().proxyURL;
                    } else {
                        if(message.embeds[0] && message.embeds[0].type == "image") {
                            attachmentURL = message.embeds[0].url
                        }
                    }
                    if(attachmentURL) return attachmentURL
                }).filter(a => a != undefined);
                if(attachmentMessages[0]) {
                    resolve(attachmentMessages[0])
                } else {
                    reject()
                }
            }
        } catch(e) {
            reject(e)
        }
    })
}

module.exports = {
    findImage
}