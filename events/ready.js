module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`[✅ Defender Bot] Đã online: ${client.user.tag}`);
        console.log(`[ℹ️  Chức năng] Anti-Spam | Anti-Link | Anti-Nuke | Anti-Raid | Anti-Clone | Anti-HitRun`);

        // Dọn dẹp RAM (Garbage Collection) định kỳ mỗi 60 giây để chống tràn Memory
        setInterval(() => {
            const now = Date.now();
            const config = client.config;

            // Dọn rác messageCache (spam đa kênh)
            for (const [userId, userMessages] of client.messageCache.entries()) {
                const recent = userMessages.filter(msg => now - msg.timestamp <= config.SPAM_TIMEFRAME);
                if (recent.length === 0) client.messageCache.delete(userId);
                else client.messageCache.set(userId, recent);
            }

            // Dọn rác suspiciousUsers (hit-and-run)
            for (const [userId, lastLinkTime] of client.suspiciousUsers.entries()) {
                if (now - lastLinkTime > config.LINK_TRACKING_TIME)
                    client.suspiciousUsers.delete(userId);
            }

            // Dọn rác nukeTracker (anti-nuke)
            for (const [userId, actions] of client.nukeTracker.entries()) {
                const recent = actions.filter(a => now - a.timestamp <= config.NUKE_TIMEFRAME);
                if (recent.length === 0) client.nukeTracker.delete(userId);
                else client.nukeTracker.set(userId, recent);
            }

            // Dọn rác joinTracker (anti-raid)
            for (const [guildId, joins] of client.joinTracker.entries()) {
                const recent = joins.filter(j => now - j.timestamp <= config.MASS_JOIN_TIMEFRAME);
                if (recent.length === 0) client.joinTracker.delete(guildId);
                else client.joinTracker.set(guildId, recent);
            }
        }, 60000);
    },
};
