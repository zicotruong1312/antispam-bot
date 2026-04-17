require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Thiết lập Web Server nhẹ để UptimeRobot ping mỗi 5 phút (chống Sleep trên Render)
const app = express();
app.get('/', (req, res) => res.send('Defender Bot is running safely!'));
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`[Web Server] Đang giữ nhịp trên cổng ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // Bắt buộc cho mọi bot
        GatewayIntentBits.GuildMessages,       // Anti-Spam Message
        GatewayIntentBits.MessageContent,      // Đọc nội dung tin nhắn để lọc link/ping
        GatewayIntentBits.GuildMembers,        // Anti-Raid: Bắt sự kiện Join/Leave
        GatewayIntentBits.GuildModeration,     // Bắt sự kiện Ban/Kick từ Audit Log
        GatewayIntentBits.GuildExpressions,    // Theo dõi các thay đổi về Role/Emoji
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// Gắn cấu hình rate limit vào client để tiện truy xuất toàn cục
client.config = require('./config');

// Khởi tạo các Collections (RAM Cache) lưu vào client
client.messageCache   = new Collection(); // Anti-Spam: theo dõi tin nhắn đa kênh
client.suspiciousUsers = new Collection(); // Anti-Spam: theo dõi hit-and-run link
client.nukeTracker    = new Collection(); // Anti-Nuke: theo dõi hành động phá hoại
client.joinTracker    = new Collection(); // Anti-Raid: theo dõi join hàng loạt

// Đọc và nạp toàn bộ các Events từ thư mục /events/
const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath);
}

const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
let eventCount = 0;

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.name && event.execute) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        eventCount++;
    }
}
console.log(`[Events] Đã tải thành công ${eventCount} sự kiện.`);

if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_discord_bot_token_here') {
    console.error('[Lỗi Khởi Động] Vui lòng cập nhật DISCORD_TOKEN vào trong file .env !!');
    process.exit(1);
}

// Chạy bot
client.login(process.env.DISCORD_TOKEN);
