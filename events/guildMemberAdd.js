module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const config = client.config;
        const guild = member.guild;
        const now = Date.now();
        const guildId = guild.id;

        // Ghi nhận người vừa join vào bộ đếm
        if (!client.joinTracker.has(guildId)) {
            client.joinTracker.set(guildId, []);
        }

        const joinList = client.joinTracker.get(guildId);
        joinList.push({ userId: member.user.id, timestamp: now });

        // Chỉ giữ lại những người join trong cửa sổ thời gian
        const recentJoins = joinList.filter(j => now - j.timestamp <= config.MASS_JOIN_TIMEFRAME);
        client.joinTracker.set(guildId, recentJoins);

        // Chưa vượt ngưỡng => cho vào bình thường, không làm gì cả
        if (recentJoins.length < config.MASS_JOIN_THRESHOLD) return;

        // =========================================================
        // KÍCH HOẠT CHỐNG RAID!
        // Kick TOÀN BỘ những người vừa join trong cửa sổ thời gian
        // =========================================================
        console.warn(`[🚨 RAID] ${guild.name}: ${recentJoins.length} người join trong ${config.MASS_JOIN_TIMEFRAME / 1000}s — Đang kick hàng loạt...`);

        // Xoá tracker ngay để tránh trigger lặp lại với người join tiếp theo
        client.joinTracker.delete(guildId);

        let kickedCount = 0;

        for (const entry of recentJoins) {
            try {
                const target = await guild.members.fetch(entry.userId).catch(() => null);
                if (!target) continue;

                // Bỏ qua nếu có quyền Administrator (tránh kick nhầm Admin)
                if (target.permissions.has('Administrator')) continue;

                // Bỏ qua chính bot
                if (entry.userId === client.user.id) continue;

                await target.kick(`[Anti-Raid] Bị kick do join hàng loạt bất thường (${recentJoins.length} người / ${config.MASS_JOIN_TIMEFRAME / 1000}s)`);
                kickedCount++;
            } catch (err) {
                console.error(`[Lỗi Anti-Raid] Không thể kick ${entry.userId}:`, err.message);
            }
        }

        console.log(`[✅ RAID] Đã kick ${kickedCount}/${recentJoins.length} người trong đợt raid.`);

        // Thông báo cho Server Owner
        try {
            const owner = await guild.fetchOwner();
            await owner.send(
                `🚨 **BÁO ĐỘNG RAID** — Server **${guild.name}**\n\n` +
                `Phát hiện **${recentJoins.length} tài khoản** join trong vòng **${config.MASS_JOIN_TIMEFRAME / 1000} giây**.\n\n` +
                `✅ Đã tự động kick **${kickedCount} tài khoản** trong đợt raid.\n\n` +
                `⏰ <t:${Math.floor(now / 1000)}:F>`
            ).catch(() => {});
        } catch { /* Không DM được owner thì thôi */ }
    },
};
