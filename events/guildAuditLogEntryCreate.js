const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');

// Tất cả các loại hành động phá hoại cần theo dõi
const TRACKED_ACTIONS = [
    AuditLogEvent.ChannelCreate,
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.RoleCreate,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.MemberBanAdd,
    AuditLogEvent.MemberKick,
    AuditLogEvent.WebhookCreate,
    AuditLogEvent.WebhookDelete,
    AuditLogEvent.GuildUpdate,
];

module.exports = {
    name: 'guildAuditLogEntryCreate',
    async execute(auditLog, guild, client) {
        // Bỏ qua nếu không có thông tin người thực hiện
        if (!auditLog.executorId) return;
        const executorId = auditLog.executorId;

        // Bỏ qua hành động của chính bot (tránh vòng lặp)
        if (executorId === client.user.id) return;

        // Kiểm tra xem hành động này có phải loại phá hoại không
        if (!TRACKED_ACTIONS.includes(auditLog.action)) return;

        // =========================================================
        // WHITELIST: Có quyền Administrator => MIỄN TRỪ HOÀN TOÀN
        // =========================================================
        try {
            const executor = await guild.members.fetch(executorId).catch(() => null);
            if (executor && executor.permissions.has(PermissionFlagsBits.Administrator)) return;
        } catch { /* Không fetch được (đã thoát) => tiếp tục xử lý */ }

        // =========================================================
        // CHỨC NĂNG (Defender): ANTI-NUKE — đếm hành động phá hoại
        // =========================================================
        const config = client.config;
        const now = Date.now();

        if (!client.nukeTracker.has(executorId)) {
            client.nukeTracker.set(executorId, []);
        }

        const actions = client.nukeTracker.get(executorId);
        actions.push({ type: auditLog.action, timestamp: now });

        // Chỉ giữ hành động trong cửa sổ thời gian
        const recentActions = actions.filter(a => now - a.timestamp <= config.NUKE_TIMEFRAME);
        client.nukeTracker.set(executorId, recentActions);

        console.log(`[AUDIT] ${executorId} — Action: ${auditLog.action} — ${recentActions.length}/${config.NUKE_ACTION_THRESHOLD} trong ${config.NUKE_TIMEFRAME / 1000}s`);

        // Chưa chạm ngưỡng
        if (recentActions.length < config.NUKE_ACTION_THRESHOLD) return;

        // =========================================================
        // KÍCH HOẠT! => BAN NGAY
        // =========================================================
        console.error(`[🚨 NUKE DETECTED] ${executorId} thực hiện ${recentActions.length} hành động phá hoại! ĐANG BAN...`);
        client.nukeTracker.delete(executorId); // Xoá ngay để không trigger lặp

        try {
            const target = await guild.members.fetch(executorId).catch(() => null);

            if (target) {
                await guild.members.ban(executorId, {
                    deleteMessageSeconds: 604800,
                    reason: `[Anti-Nuke] Auto-Ban: ${recentActions.length} hành động phá hoại trong ${config.NUKE_TIMEFRAME / 1000}s`
                });
            } else {
                // Đã thoát server nhưng vẫn ban để không quay lại
                await guild.bans.create(executorId, {
                    deleteMessageSeconds: 604800,
                    reason: `[Anti-Nuke] Truy-Ban: Phá hoại server rồi thoát (${recentActions.length} actions)`
                });
            }

            console.log(`[✅ NUKE] Đã ban kẻ tấn công: ${executorId}`);

            // Thông báo cho Server Owner
            try {
                const owner = await guild.fetchOwner();
                await owner.send(
                    `🚨 **BÁO ĐỘNG NUKE** — Server **${guild.name}**\n\n` +
                    `Phát hiện <@${executorId}> thực hiện **${recentActions.length} hành động phá hoại** trong **${config.NUKE_TIMEFRAME / 1000}s**.\n\n` +
                    `**Loại hành động cuối:** \`${auditLog.actionType}\`\n` +
                    `✅ Kẻ tấn công đã bị **BAN tự động**. Kiểm tra lại server ngay!`
                ).catch(() => {});
            } catch { /* Không DM được owner thì log console là đủ */ }

        } catch (err) {
            console.error(`[Lỗi Anti-Nuke] Không thể ban kẻ tấn công ${executorId}:`, err.message);
        }
    },
};
