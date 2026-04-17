module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        const userId = member.id;
        const now = Date.now();
        const config = client.config;

        // =========================================================
        // CHỨC NĂNG (AntiSpam): CHỐNG HIT-AND-RUN
        // Người ném link rồi thoát server trong vòng 5 phút => Truy ban
        // =========================================================
        if (!client.suspiciousUsers.has(userId)) return;

        const lastLinkTime = client.suspiciousUsers.get(userId);

        if (now - lastLinkTime <= config.HIT_AND_RUN_WINDOW) {
            try {
                await member.guild.members.ban(userId, {
                    deleteMessageSeconds: 604800,
                    reason: '[Auto-Ban] Hit-And-Run: Ném link rồi thoát server để trốn xoá tin nhắn.'
                });
                console.log(`[BANNED - HIT&RUN] Truy ban thành công: ${member.user?.tag || userId}`);
            } catch (err) {
                console.error(`[Lỗi Hit-And-Run] Không thể truy ban ${userId}:`, err.message);
            }
        }

        client.suspiciousUsers.delete(userId);
    },
};
