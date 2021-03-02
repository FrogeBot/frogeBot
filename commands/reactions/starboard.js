require("dotenv").config()

const escapeMarkdown = s => s.replace(/([\[\]\(\)])/g, '\\$&')
const attachmentType = a =>
  ({
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      mp4: 'video',
      mov: 'video',
      webm: 'video',
  }[fileExtension(a.url).toLowerCase()])

const fileExtension = url => {
  if (!url) return

  return url.split('.').pop().split(/\#|\?/)[0]
}

async function starFunc(reaction, member, data, startTime) {
  const channel = await reaction.client.channels.fetch(data.channel.toString())
  if(!channel || reaction.message.channel.id == channel.id) return
  const messages = await channel.messages.fetch({ limit: 100 }); 
  const inBoard = messages.find(m => (m.embeds && m.embeds.length >= 1 && m.embeds[0].description.endsWith(`[Jump to Message](${reaction.message.url})`))); 

  if(inBoard) {
    inBoard.edit(inBoard.embeds[0].setFooter(`⭐ ${reaction.count}`))
    if(reaction.count < data.count) return
  } else {
    if(reaction.count < data.count) return
    const attachments = [...reaction.message.attachments.values()]
    const primaryAttachment = attachments.shift()
    let attachmentEmbed = {},
        files = []
    if (primaryAttachment) {
      switch (attachmentType(primaryAttachment)) {
        case 'image':
          attachmentEmbed = {
              image: { url: primaryAttachment.proxyURL },
          }
          break
        case 'video':
          files = [{ attachment: primaryAttachment.proxyURL }]
          break
        default:
          // Unknown; we'll handle it with all the other attachments
          attachments.unshift(primaryAttachment)
      }
    }
    const fields = []
    // Add reamining attachments to an extra field
    if (attachments.length) {
      fields.push({
        name: 'Attachments',
        value: attachments
          .map(a => `[${a.proxyURL.substring(a.proxyURL.lastIndexOf('/') + 1)}](${a.proxyURL})`,)
          .join('\n'),
      })
    }
    channel.send({
      files,
      embed: {
        color: data.colour,
        author: {
          name: reaction.message.member.displayName,
          icon_url: await reaction.message.author.displayAvatarURL(),
        },
        description: `${escapeMarkdown(reaction.message.content)}\n\n[Jump to Message](${reaction.message.url})`,
        timestamp: reaction.message.createdTimestamp,
        footer: {
          text: `⭐ ${reaction.count}`
        },
        fields,
        ...attachmentEmbed,
      },
    })
  }
}

module.exports = {
  reactionAddFunc: starFunc,
  reactionRemoveFunc: starFunc,
}