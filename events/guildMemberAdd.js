module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const config = client.config;
        const guild = member.guild;
        const now = Date.now();

        // =========================================================
        // CHỨC NĂNG 1 (Defender): CHỐNG TÀI KHOẢN CLONE / BOTNET
        // Kick tài khoản Discord được tạo dưới MIN_ACCOUNT_AGE
        // =========================================================
        const accountAge = now - member.user.createdTimestamp;
        if (accountAge < config.MIN_ACCOUNT_AGE) {
            const ageDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
            try {
                // Gửi DM thân thiện trước khi kick
                await member.send(
                    `👋 Chào mừng đến **${guild.name}**!\n\n` +
                    `⚠️ Hệ thống bảo mật của server yêu cầu tài khoản phải **ít nhất 3 ngày tuổi** mới có thể vào.\n\n` +
                    `Tài khoản của bạn hiện chỉ **${ageDays} ngày tuổi**. Vui lòng quay lại sau!`
                ).catch(() => {});
                await member.kick('[Auto-Kick] Tài khoản quá mới (< 3 ngày). Nghi ngờ Bot/Clone.');
                console.log(`[KICK - CLONE] ${member.user.tag} (${member.user.id}) — Tuổi acc: ${ageDays} ngày`);
            } catch (err) {
                console.error(`[Lỗi Anti-Clone] Không thể kick ${member.user.id}:`, err.message);
            }
            return;
        }

        // =========================================================
        // CHỨC NĂNG 2 (Defender): PHÁT HIỆN RAID (MASS JOIN)
        // Cảnh báo Owner nếu >= MASS_JOIN_THRESHOLD người join trong 10s
        // =========================================================
        const guildId = guild.id;

        if (!client.joinTracker.has(guildId)) {
            client.joinTracker.set(guildId, []);
        }

        const joinList = client.joinTracker.get(guildId);
        joinList.push({ userId: member.user.id, timestamp: now });

        const recentJoins = joinList.filter(j => now - j.timestamp <= config.MASS_JOIN_TIMEFRAME);
        client.joinTracker.set(guildId, recentJoins);

        if (recentJoins.length >= config.MASS_JOIN_THRESHOLD) {
            console.warn(`[⚠️ RAID ALERT] ${guild.name}: ${recentJoins.length} người join trong ${config.MASS_JOIN_TIMEFRAME / 1000}s!`);
            try {
                const owner = await guild.fetchOwner();
                await owner.send(
                    `🚨 **CẢNH BÁO RAID** — Server **${guild.name}**\n\n` +
                    `Phát hiện **${recentJoins.length} tài khoản** join trong **${config.MASS_JOIN_TIMEFRAME / 1000} giây**.\n\n` +
                    `> **Khuyến nghị:** Bật Membership Screening hoặc tăng mức xác minh server.\n\n` +
                    `⏰ <t:${Math.floor(now / 1000)}:F>`
                ).catch(() => {});
            } catch { /* Không DM được owner thì bỏ qua */ }
        }
    },
};
