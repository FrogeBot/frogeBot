require("dotenv").config()

async function cmdFunc(msg, args) {
    let idMember;
    try {
        idMember = await msg.guild.members.fetch(args)
    } catch (e) {}
    
    let member = ( args == "" ? msg.member : ( idMember != undefined ? idMember : (await msg.guild.members.fetch({ query: args, limit: 1 })).first() ) )

    const regex = /(\<\@!?[0-9]+\>)/g;
    const regex2 = /([0-9]+)/g;
    if(args.match(regex)) {
        member = msg.guild.members.resolve(args.match(regex)[0].match(regex2)[0]);
    }
    if(member == undefined)  {
        msg.channel.send({
            "embed": {
                "title": "Avatar",
                "description": `No user found`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
    } else {
        msg.channel.send({
            "embed": {
                "title": "Avatar",
                "description": `Here's ${member}'s avatar`,
                "image": {
                    "url": member.user.displayAvatarURL()+"?size=1024"
                },
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
    }
}

module.exports = {
    cmdFunc
}