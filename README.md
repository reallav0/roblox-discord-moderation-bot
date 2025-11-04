# Roblox Discord Moderation Bot (Commissions)

A Discord moderation system integrated with Roblox’s **MessagingService** and **Datastore API**.
This bot allows Discord moderators to execute in-game actions like banning, unbanning, or kicking players — with automatic audit logging and Roblox profile linking.

---

## Features

* `/ban`, `/unban`, `/kick` commands for in-game moderation
* `/getstats` command to fetch player stats directly from Roblox DataStore
* MessagingService integration for Roblox ↔ Discord communication
* Automatic audit log embeds with profile, reason, and moderator info
* Interactive buttons for unban and adding evidence
* RESTful Express backend (`GET /`) for status or web integrations

---

## Tech Stack

* **Node.js**
* **Discord.js v14**
* **Express**
* **noblox.js**
* **Roblox MessagingService API**
* **dotenv**

---

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/roblox-discord-moderation-bot.git
   cd roblox-discord-moderation-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following:

   ```bash
   TOKEN=your_discord_bot_token
   GUILD_ID=your_discord_server_id
   UNIVERSE_ID=your_roblox_universe_id
   ROBLOX_API_KEY=your_roblox_open_cloud_key
   AUDIT_CHANNEL_ID=your_audit_log_channel_id
   ```

4. Start the bot:

   ```bash
   node index.js
   ```

---

## Commands

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| `/ban <user> [reason]`   | Bans a Roblox player and logs the action.   |
| `/unban <user> [reason]` | Unbans a player.                            |
| `/kick <user> [reason]`  | Kicks a player in-game.                     |
| `/getstats <user>`       | Fetches player stats from Roblox DataStore. |

---

## Audit Log Example

Each moderation action sends an embed containing:

* Player name and ID
* Moderator and reason
* Buttons: **View Profile**, **Unban**, and **Add Evidence**

---

## License

MIT License © 2025 ReallAv0
