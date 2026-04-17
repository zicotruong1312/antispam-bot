const { checkLink } = require('../linkDetector');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Bỏ qua tin nhắn từ Bot và tin nhắn ngoài server (DM)
        if (message.author.bot || !message.guild) return;

        // ✅ WHITELIST: Bỏ qua hoàn toàn nếu user có quyền Administrator
        if (message.member && message.member.permissions.has('Administrator')) return;

        const userId = message.author.id;
        const now = Date.now();
        const config = client.config;
        const linkStatus = checkLink(message.content);

        // =========================================================
        // CHỨC NĂNG 1 (AntiSpam): PHÁT HIỆN LINK PHISHING / MÃ ĐỘC
        // =========================================================
        if (linkStatus.isMalicious) {
            try {
                await message.delete().catch(() => {});
                await message.guild.members.ban(userId, {
                    deleteMessageSeconds: 604800,
                    reason: `[Auto-Ban] Gửi link lừa đảo/mã độc (${linkStatus.domain || 'Typosquatting'})`
                });
                console.log(`[BANNED - PHISHING] ${message.author.tag} (${userId}) - Domain: ${linkStatus.domain}`);
                client.messageCache.delete(userId);
                client.suspiciousUsers.delete(userId);
            } catch (err) {
                console.error(`[Lỗi Anti-Link] Không thể ban ${userId}:`, err.message);
            }
            return;
        }

        // =========================================================
        // CHỨC NĂNG 2 (AntiSpam): THEO DÕI HIT-AND-RUN
        // Ghi nhận user gửi link để bắt nếu họ thoát ngay sau đó
        // =========================================================
        if (linkStatus.hasLink) {
            client.suspiciousUsers.set(userId, now);
        }

        // =========================================================
        // CHỨC NĂNG 3 (AntiSpam): CHỐNG SPAM NHIỀU KÊNH CÙNG LÚC
        // Ban nếu gửi >= SPAM_CHANNELS_THRESHOLD kênh trong SPAM_TIMEFRAME giây
        // =========================================================
        if (!client.messageCache.has(userId)) {
            client.messageCache.set(userId, []);
        }

        const userMessages = client.messageCache.get(userId);
        userMessages.push({ channelId: message.channel.id, timestamp: now });

        // Chỉ giữ lại các tin nhắn trong cửa sổ thời gian theo dõi
        const recentMessages = userMessages.filter(msg => now - msg.timestamp <= config.SPAM_TIMEFRAME);
        client.messageCache.set(userId, recentMessages);

        const uniqueChannels = new Set(recentMessages.map(msg => msg.channelId)).size;

        if (uniqueChannels >= config.SPAM_CHANNELS_THRESHOLD) {
            try {
                await message.guild.members.ban(userId, {
                    deleteMessageSeconds: 604800,
                    reason: `[Auto-Ban] Spam ${uniqueChannels} kênh khác nhau trong ${config.SPAM_TIMEFRAME / 1000}s`
                });
                console.log(`[BANNED - SPAM] ${message.author.tag} (${userId}) — ${uniqueChannels} kênh / ${config.SPAM_TIMEFRAME / 1000}s`);
                client.messageCache.delete(userId);
                client.suspiciousUsers.delete(userId);
            } catch (err) {
                console.error(`[Lỗi Anti-Spam] Không thể ban ${userId}:`, err.message);
            }
        }
    },
};
