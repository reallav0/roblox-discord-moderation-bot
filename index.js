require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const noblox = require("noblox.js");
const {
  Client,
  GatewayIntentBits,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle
} = require('discord.js');

const app = express();
const port = 3000;
const pendingStatRequests = {};
const UNIVERSE_ID = '';
const ROBLOX_API_KEY = '';
const AUDIT_CHANNEL_ID = '';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Send to Roblox MessagingService
async function sendToRobloxMessagingService(type, username, reason, moderator = { id: 'Unknown', tag: 'Unknown#0000' }) {
  const message = {
    type,
    data: {
      target_player: username,
      reason,
      duration: 7,
      by: {
        id: moderator.id,
        tag: moderator.tag
      }
    }
  };

  try {
    const response = await fetch(`https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/DiscordCommand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ROBLOX_API_KEY
      },
      body: JSON.stringify({ message: JSON.stringify(message) })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ Failed to send to Roblox: ${err}`);
    } else {
      console.log(`✅ Sent ${type} for ${username} to Roblox.`);
    }
  } catch (error) {
    console.error(`❌ Error sending to Roblox MessagingService:`, error);
  }
}

// Get avatar image
async function getRobloxAvatarUrl(userId) {
  const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`);
  const data = await res.json();
  return data?.data?.[0]?.imageUrl || null;
}

// Send audit log
async function sendAuditLog(action, username, userId, moderator, reason) {
  try {
    const auditChannel = await client.channels.fetch(AUDIT_CHANNEL_ID);
    if (!auditChannel) return;

    const avatarUrl = await getRobloxAvatarUrl(userId);

    const embed = new EmbedBuilder()
      .setTitle(`🚨 ${action.toUpperCase()} Action`)
      .setThumbnail(avatarUrl)
      .addFields(
        { name: "Target", value: `${username} (${userId})`, inline: true },
        { name: "Moderator", value: `<@${moderator.id}> (${moderator.tag})`, inline: true },
        { name: "Reason", value: reason || "No reason provided", inline: false }
      )
      .setColor(action === "ban" ? 0xff0000 : action === "kick" ? 0xffcc00 : 0x00cc66)
      .setTimestamp();

      const viewProfileButton = new ButtonBuilder()
      .setLabel("View Profile")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.roblox.com/users/${userId}/profile`);
    
    const unbanButton = new ButtonBuilder()
      .setCustomId(`unban_${userId}`)
      .setLabel("Unban")
      .setStyle(ButtonStyle.Danger);
    
    const evidenceButton = new ButtonBuilder()
      .setCustomId(`evidence_${userId}`)
      .setLabel("Add Evidence")
      .setStyle(ButtonStyle.Primary);
    
    const row = new ActionRowBuilder().addComponents(
      viewProfileButton,
      unbanButton,
      evidenceButton
    );

    await auditChannel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error("❌ Failed to send audit log:", err);
  }
}

// Bot ready
client.once('ready', async () => {
  console.log('✅ Discord Bot is online!');

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const commands = guild ? guild.commands : client.application?.commands;

  const commandOptions = [
    { name: 'user', description: 'Username or ID', type: ApplicationCommandOptionType.String, required: true },
    { name: 'reason', description: 'Reason for action', type: ApplicationCommandOptionType.String, required: false }
  ];

  await commands?.create({ name: 'ban', description: 'Ban a player', options: commandOptions });
  await commands?.create({ name: 'unban', description: 'Unban a player', options: commandOptions });
  await commands?.create({ name: 'kick', description: 'Kick a player', options: commandOptions });
  await commands?.create({
    name: 'getstats',
    description: 'Fetch all player stats (must be online)',
    options: [
      { name: 'user', description: 'Roblox username', type: ApplicationCommandOptionType.String, required: true },
    ],
  });
});

// Command handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const rawInput = interaction.options.getString('user').trim();
  const reason = interaction.options.getString('reason') || "No reason provided";

  const moderator = {
    id: interaction.user.id,
    tag: interaction.user.tag,
  };

  let robloxId, robloxUsername;

  try {
    if (/^\d+$/.test(rawInput)) {
      robloxId = parseInt(rawInput);
      robloxUsername = await noblox.getUsernameFromId(robloxId);
    } else {
      robloxUsername = rawInput;
      robloxId = await noblox.getIdFromUsername(robloxUsername);
    }
  } catch (err) {
    return interaction.reply({ content: `❌ Failed to resolve Roblox user: ${err.message}`, ephemeral: true });
  }

  const actionType = interaction.commandName.toLowerCase();

  if (["ban", "unban", "kick"].includes(actionType)) {
    await sendToRobloxMessagingService(actionType, robloxUsername, reason, moderator);
    await interaction.reply({ content: `✅ Successfully ${actionType}ned **${robloxUsername}** for reason: *${reason}*`, ephemeral: true });
    await sendAuditLog(actionType, robloxUsername, robloxId, moderator, reason);
  }
  if (interaction.commandName === "getstats") {
    const robloxUsername = interaction.options.getString("user");
    await interaction.deferReply({ ephemeral: true });
  
    try {
      const userRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [robloxUsername] })
      });
  
      const userData = await userRes.json();
      if (!userData?.data?.[0]) {
        return interaction.editReply(`❌ Could not find Roblox user **${robloxUsername}**.`);
      }
  
      const userId = userData.data[0].id;
      const entryKey = `User_${userId}`; 
      const datastoreName = "Leaderboards"; 
    
      const dataRes = await fetch(`https://apis.roblox.com/datastores/v1/universes/${ROBLOX_API_KEY}/standard-datastores/datastore/entries/entry?datastoreName=${datastoreName}&entryKey=${entryKey}`, {
        method: 'GET',
        headers: {
          'x-api-key': ROBLOX_API_KEY
        }
      });
  
      if (!dataRes.ok) {
        const errMsg = await dataRes.text();
        return interaction.editReply(`❌ Failed to fetch stats: ${dataRes.status} - ${errMsg}`);
      }
  
      const stats = await dataRes.json();
  
      const formattedStats = Object.entries(stats)
        .map(([key, value]) => `**${key}**: ${value}`)
        .join('\n');
  
      await interaction.editReply(`📊 Stats for **${robloxUsername}**:\n${formattedStats}`);
    } catch (err) {
      console.error(err);
      await interaction.editReply(`❌ An error occurred: ${err.message}`);
    }
  }
  
  
  
  
});
client.on('interactionCreate', async (interaction) => {
  // Handle buttons
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split('_');

    if (action === 'unban') {
      try {
        const username = await noblox.getUsernameFromId(userId);
        const reason = 'Unbanned via button';

        await sendToRobloxMessagingService('unban', username, reason, {
          id: interaction.user.id,
          tag: interaction.user.tag,
        });

        await sendAuditLog('unban', username, userId, interaction.user, reason);
        await interaction.reply({ content: `✅ Successfully unbanned **${username}**`, ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: `❌ Failed to unban user: ${err.message}`, ephemeral: true });
      }
    }

    if (action === 'evidence') {
      const modal = {
        title: 'Add Evidence',
        custom_id: `addEvidence_${userId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'evidenceInput',
                style: 2,
                label: 'Evidence Description',
                placeholder: 'Enter details or links here...',
                required: true,
              },
            ],
          },
        ],
      };
      await interaction.showModal(modal);
    }
  }

  // Handle modal submission
  if (interaction.isModalSubmit()) {
    const [action, userId] = interaction.customId.split('_');
    if (action === 'addEvidence') {
      const evidence = interaction.fields.getTextInputValue('evidenceInput');

      try {
        const message = await interaction.channel.messages.fetch(interaction.message.id);

        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.addFields({ name: "Evidence", value: evidence });

        await message.edit({ embeds: [embed] });
        await interaction.reply({ content: "✅ Evidence added successfully.", ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: `❌ Failed to add evidence: ${err.message}`, ephemeral: true });
      }
    }
  }
});
app.get('/', (req, res) => {
  res.send('Bot + Webserver running!');
});

app.listen(port, () => {
  console.log(`🚀 Web server running on port ${port}`);
});

// Login to Discord
client.login(process.env.TOKEN);
