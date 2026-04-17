/**
 * ==========================================================
 *        CẤU HÌNH BOT DEFENDER - TẤT CẢ NGƯỠNG GIỚI HẠN
 * ==========================================================
 * Mọi thay đổi ngưỡng phòng thủ đều được chỉnh tại đây.
 * Không cần đụng vào code logic của các module events.
 */
module.exports = {

    // ==========================================================
    // MODULE 1: ANTI-SPAM TIN NHẮN (events/messageCreate.js)
    // ==========================================================

    /**
     * SPAM ĐA KÊNH - Ngăn kẻ tấn công spam cùng lúc nhiều kênh.
     * Logic: Nếu user gửi >= SPAM_CHANNELS_THRESHOLD kênh khác nhau
     *        trong SPAM_TIMEFRAME milliseconds => BAN.
     * Ngưỡng an toàn: User bình thường không bao giờ chat 3+ kênh khác nhau trong 10 giây.
     */
    SPAM_TIMEFRAME: 10 * 1000,          // Cửa sổ theo dõi: 10 giây
    SPAM_CHANNELS_THRESHOLD: 3,         // Ban nếu spam qua >= 3 kênh khác nhau trong 10s

    // ==========================================================
    // MODULE 2: HIT-AND-RUN DETECTION (events/guildMemberRemove.js)
    // ==========================================================

    /**
     * Kẻ tấn công ném link phishing vào server rồi nhanh chóng thoát
     * để tránh bị xoá tin nhắn. Bot sẽ tiến hành truy ban.
     */
    LINK_TRACKING_TIME: 15 * 60 * 1000, // Giữ bộ nhớ theo dõi link trong 15 phút
    HIT_AND_RUN_WINDOW: 5 * 60 * 1000,  // Thoát trong 5 phút sau khi ném link => Truy ban

    // ==========================================================
    // MODULE 3: ANTI-RAID (events/guildMemberAdd.js)
    // ==========================================================

    /**
     * PHÁT HIỆN RAID (MASS JOIN) - Kick toàn bộ đợt join bất thường.
     * Logic: Bất kỳ ai join bình thường đều được vào tự do, không giới hạn tuổi acc.
     * Chỉ khi >= MASS_JOIN_THRESHOLD người join trong MASS_JOIN_TIMEFRAME giây
     * thì coi đó là Raid => Kick toàn bộ những người vừa vào trong đợt đó.
     */
    MASS_JOIN_TIMEFRAME: 10 * 1000,     // Cửa sổ theo dõi: 10 giây
    MASS_JOIN_THRESHOLD: 10,            // Kick hàng loạt nếu >= 10 người join trong 10s

    // ==========================================================
    // MODULE 4: ANTI-NUKE (events/guildAuditLogEntryCreate.js)
    // ==========================================================

    /**
     * CHỐNG PHÁ HOẠI SERVER (Nuke).
     * Whitelist: Bất kỳ ai có quyền Administrator => HOÀN TOÀN MIỄN TRỪ.
     * Chỉ người KHÔNG có quyền Admin mới bị giám sát.
     *
     * CÁC HÀNH ĐỘNG BỊ THEO DÕI:
     *   ChannelDelete, RoleDelete, ChannelCreate, RoleCreate,
     *   MemberBanAdd, MemberKick, WebhookCreate, WebhookDelete, GuildUpdate
     */
    NUKE_TIMEFRAME: 10 * 1000,          // Cửa sổ theo dõi: 10 giây
    NUKE_ACTION_THRESHOLD: 3,           // Ban nếu thực hiện >= 3 hành động phá hoại liên tiếp
};
