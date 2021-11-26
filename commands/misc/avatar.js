require("dotenv").config()

async function cmdFunc(msg, args) {
    let idMember;
    try {
        idMember = await msg.guild.members.fetch(args[0]) // Attempt to get member from ID. idMember will stay undefined if the supplied arguments are not an ID
    } catch (e) {}
    
    let member = ( args == "" ? msg.member : ( idMember != undefined ? idMember : (await msg.guild.members.fetch({ query: args, limit: 1 })).first() ) ) // Either use idMember or search for member in guild

    const regex = /(\<\@!?[0-9]+\>)/g;
    const regex2 = /([0-9]+)/g;
    if(args[0] && args[0].match(regex)) { // If args is a mention
        member = msg.guild.members.resolve(args[0].match(regex)[0].match(regex2)[0]); // Get ID from mention and use to get member
    }
    if(member == undefined)  { // If no member found
        msg.reply({
            "embeds": [{
                "title": "Avatar",
                "description": `${process.env.MSG_ERROR} - No user found`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }]
        })
    } else { // If member was successfully found
        msg.reply({
            "embeds": [{
                "title": "Avatar",
                "description": `${process.env.MSG_SUCCESS} Here's ${member}'s avatar`,
                "image": {
                    "url": member.user.displayAvatarURL({ format: "png", dynamic: true, size: 1024 })
                },
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }]
        })
    }
}

module.exports = {
    cmdFunc
}