/**
 * Multilingual Email Templates for Gia Phả Reminders
 * Supports: Vietnamese (vi), English (en), Chinese Simplified (zh)
 * Event Types: Birthday, Death Anniversary, Custom Events, Weekly Summary
 */

export type EmailLanguage = "vi" | "en" | "zh";
export type ReminderType = "birthday" | "death_anniversary" | "custom_event" | "weekly_summary";

interface EmailTemplateParams {
  language: EmailLanguage;
  familyName: string;
  personName: string;
  daysUntil: number;
  dateLabel: string;
  lunarMonth?: number;
  lunarDay?: number;
  dashboardUrl: string;
}

interface WeeklySummaryParams extends Omit<EmailTemplateParams, "personName" | "dateLabel"> {
  events: Array<{
    personName: string;
    type: "birthday" | "death_anniversary" | "custom_event";
    dateLabel: string;
    daysUntil: number;
    lunarMonth?: number;
    lunarDay?: number;
  }>;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations = {
  vi: {
    birthday: "Sinh nhật",
    death_anniversary: "Ngày giỗ",
    custom_event: "Sự kiện",
    today: "Hôm nay",
    tomorrow: "Ngày mai",
    daysFromNow: (n: number) => `${n} ngày nữa`,
    time: "Thời gian",
    viewFamily: "Xem gia phả →",
    emailFrom: "Email tự động từ hệ thống Gia Phả",
    unsubscribeText: "Truy cập",
    unsubscribeLink: "cài đặt",
    toDisable: "để tắt thông báo",
    lunarDate: "Âm lịch",
    weeklySubject: "[Gia Phả] Các sự kiện tuần này",
    weeklyGreeting: "Xin chào",
    weeklyIntro: "Dưới đây là các sự kiện sắp tới trong gia đình bạn:",
    weeklySummary: "Tóm tắt sự kiện",
  },
  en: {
    birthday: "Birthday",
    death_anniversary: "Death Anniversary",
    custom_event: "Event",
    today: "Today",
    tomorrow: "Tomorrow",
    daysFromNow: (n: number) => `in ${n} days`,
    time: "Time",
    viewFamily: "View family tree →",
    emailFrom: "Automated email from Gia Phả system",
    unsubscribeText: "Visit",
    unsubscribeLink: "settings",
    toDisable: "to disable notifications",
    lunarDate: "Lunar Date",
    weeklySubject: "[Gia Phả] Upcoming events this week",
    weeklyGreeting: "Hello",
    weeklyIntro: "Here are the upcoming events in your family:",
    weeklySummary: "Event Summary",
  },
  zh: {
    birthday: "生日",
    death_anniversary: "忌日",
    custom_event: "事件",
    today: "今天",
    tomorrow: "明天",
    daysFromNow: (n: number) => `${n}天后`,
    time: "时间",
    viewFamily: "查看家族树 →",
    emailFrom: "来自Gia Phả系统的自动邮件",
    unsubscribeText: "访问",
    unsubscribeLink: "设置",
    toDisable: "以禁用通知",
    lunarDate: "农历",
    weeklySubject: "[Gia Phả] 本周的事件",
    weeklyGreeting: "你好",
    weeklyIntro: "以下是您家族中即将发生的事件:",
    weeklySummary: "事件摘要",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getEmoji(type: ReminderType): string {
  switch (type) {
    case "birthday":
      return "🎂";
    case "death_anniversary":
      return "🕯️";
    case "custom_event":
      return "📅";
    case "weekly_summary":
      return "📬";
  }
}

function getTimeLabel(daysUntil: number, lang: EmailLanguage): string {
  const trans = translations[lang as keyof typeof translations];
  if (daysUntil === 0) return trans.today;
  if (daysUntil === 1) return trans.tomorrow;
  return trans.daysFromNow(daysUntil);
}

function formatLunarDate(month?: number, day?: number, lang?: EmailLanguage): string | null {
  if (month === undefined || day === undefined) return null;
  const trans = translations[(lang || "en") as keyof typeof translations];
  if (lang === "zh") {
    return `${trans.lunarDate}：农历 ${month}月 ${day}日`;
  }
  return `${trans.lunarDate}: Ngày ${day} tháng ${month}`;
}

// ============================================================================
// SINGLE EVENT TEMPLATES
// ============================================================================

export function buildBirthdayEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
} {
  const trans = translations[params.language];
  const typeLabel = trans.birthday;
  const emoji = getEmoji("birthday");
  const timeLabel = getTimeLabel(params.daysUntil, params.language);
  const lunarDateStr = formatLunarDate(
    params.lunarMonth,
    params.lunarDay,
    params.language,
  );

  const subject =
    params.language === "vi"
      ? `[Gia Phả] Sinh nhật của ${params.personName}`
      : params.language === "en"
        ? `[Gia Phả] ${params.personName}'s Birthday`
        : `[Gia Phả] ${params.personName}的生日`;

  const html = buildEmailTemplate({
    language: params.language,
    emoji,
    typeLabel,
    familyName: params.familyName,
    personName: params.personName,
    dateLabel: params.dateLabel,
    lunarDateStr,
    timeLabel,
    dashboardUrl: params.dashboardUrl,
    headerColor: "#b45309", // Amber
  });

  return { subject, html };
}

export function buildDeathAnniversaryEmail(params: EmailTemplateParams): {
  subject: string;
  html: string;
} {
  const trans = translations[params.language];
  const typeLabel = trans.death_anniversary;
  const emoji = getEmoji("death_anniversary");
  const timeLabel = getTimeLabel(params.daysUntil, params.language);
  const lunarDateStr = formatLunarDate(
    params.lunarMonth,
    params.lunarDay,
    params.language,
  );

  const subject =
    params.language === "vi"
      ? `[Gia Phả] Ngày giỗ của ${params.personName}`
      : params.language === "en"
        ? `[Gia Phả] ${params.personName}'s Death Anniversary`
        : `[Gia Phả] ${params.personName}的忌日`;

  const html = buildEmailTemplate({
    language: params.language,
    emoji,
    typeLabel,
    familyName: params.familyName,
    personName: params.personName,
    dateLabel: params.dateLabel,
    lunarDateStr,
    timeLabel,
    dashboardUrl: params.dashboardUrl,
    headerColor: "#6b5c3e", // Dark brown
  });

  return { subject, html };
}

export function buildCustomEventEmail(params: EmailTemplateParams & { eventName?: string }): {
  subject: string;
  html: string;
} {
  const trans = translations[params.language];
  const typeLabel = trans.custom_event;
  const emoji = getEmoji("custom_event");
  const timeLabel = getTimeLabel(params.daysUntil, params.language);
  const lunarDateStr = formatLunarDate(
    params.lunarMonth,
    params.lunarDay,
    params.language,
  );

  const subject =
    params.language === "vi"
      ? `[Gia Phả] Sự kiện: ${params.eventName || params.dateLabel}`
      : params.language === "en"
        ? `[Gia Phả] Event: ${params.eventName || params.dateLabel}`
        : `[Gia Phả] 事件：${params.eventName || params.dateLabel}`;

  const html = buildEmailTemplate({
    language: params.language,
    emoji,
    typeLabel,
    familyName: params.familyName,
    personName: params.personName,
    dateLabel: params.dateLabel,
    lunarDateStr,
    timeLabel,
    dashboardUrl: params.dashboardUrl,
    headerColor: "#059669", // Green
  });

  return { subject, html };
}

// ============================================================================
// WEEKLY SUMMARY TEMPLATE
// ============================================================================

export function buildWeeklySummaryEmail(params: WeeklySummaryParams): {
  subject: string;
  html: string;
} {
  const trans = translations[params.language];

  const eventRows = params.events
    .map((evt) => {
      const emoji = getEmoji(evt.type as ReminderType);
      const typeLabel =
        evt.type === "birthday"
          ? trans.birthday
          : evt.type === "death_anniversary"
            ? trans.death_anniversary
            : trans.custom_event;
      const lunarStr = formatLunarDate(evt.lunarMonth, evt.lunarDay, params.language);
      const timeLabel = getTimeLabel(evt.daysUntil, params.language);

      return `
        <tr style="border-bottom: 1px solid #e7e0d4;">
          <td style="padding: 12px; font-size: 14px;">
            <strong>${emoji} ${evt.personName}</strong><br>
            <span style="color: #6b5c3e;">${typeLabel} - ${evt.dateLabel}${
              lunarStr ? `<br>${lunarStr}` : ""
            }</span><br>
            <span style="color: #78716c; font-size: 12px;">${timeLabel}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${params.language === "zh" ? "zh" : params.language === "en" ? "en" : "vi"}">
<head>
  <meta charset="UTF-8">
  <title>${trans.weeklySubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f6f0; padding: 24px; color: #3c2f1a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #b45309, #92400e); padding: 28px 32px; text-align: center;">
      <h1 style="margin: 0; color: #fff; font-size: 22px;">📬 ${trans.weeklySummary}</h1>
      <p style="margin: 8px 0 0; color: #fde68a; font-size: 14px;">${params.familyName}</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 16px; font-size: 16px; color: #3c2f1a;">
        ${trans.weeklyGreeting} ${params.familyName},
      </p>
      <p style="margin: 0 0 20px; color: #6b5c3e; line-height: 1.6;">
        ${trans.weeklyIntro}
      </p>

      <!-- Events Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tbody>
          ${eventRows}
        </tbody>
      </table>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.dashboardUrl}/dashboard"
           style="display: inline-block; background: #b45309; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
          ${trans.viewFamily}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 32px; background: #faf7f2; border-top: 1px solid #e7e0d4;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.6;">
        ${trans.emailFrom}. 
        <a href="${params.dashboardUrl}/dashboard/settings?tab=notifications" style="color: #b45309; text-decoration: none;">
          ${trans.unsubscribeLink}
        </a> 
        ${trans.toDisable}.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject: trans.weeklySubject, html };
}

// ============================================================================
// BASE EMAIL TEMPLATE
// ============================================================================

interface BaseTemplateParams {
  language: EmailLanguage;
  emoji: string;
  typeLabel: string;
  familyName: string;
  personName: string;
  dateLabel: string;
  lunarDateStr: string | null;
  timeLabel: string;
  dashboardUrl: string;
  headerColor: string;
}

function buildEmailTemplate(params: BaseTemplateParams): string {
  const trans = translations[params.language];

  return `<!DOCTYPE html>
<html lang="${params.language === "zh" ? "zh" : params.language === "en" ? "en" : "vi"}">
<head>
  <meta charset="UTF-8">
  <title>${params.typeLabel} - ${params.familyName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    a { color: #b45309; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f6f0; padding: 24px; color: #3c2f1a; margin: 0;">
  
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: ${params.headerColor}; padding: 24px 32px;">
      <h1 style="margin: 0; color: #fff; font-size: 20px;">${params.emoji} ${params.typeLabel}</h1>
      <p style="margin: 4px 0 0; color: #fde68a; font-size: 13px;">${params.familyName}</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 32px;">
      <p style="font-size: 16px; font-weight: 600; margin: 0 0 16px; color: #3c2f1a;">
        ${params.personName}
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b5c3e;">
            <strong>${params.typeLabel}:</strong>
          </td>
          <td style="padding: 8px 0; color: #6b5c3e; text-align: right;">
            ${params.dateLabel}
          </td>
        </tr>
        ${
          params.lunarDateStr
            ? `
        <tr>
          <td style="padding: 8px 0; color: #78716c;">
            <strong>${params.lunarDateStr}</strong>
          </td>
          <td style="padding: 8px 0;"></td>
        </tr>
        `
            : ""
        }
        <tr>
          <td style="padding: 8px 0; color: #78716c;">
            <strong>${trans.time}:</strong>
          </td>
          <td style="padding: 8px 0; color: #78716c; text-align: right;">
            ${params.timeLabel}
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.dashboardUrl}/dashboard"
           style="display: inline-block; background: ${params.headerColor}; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          ${trans.viewFamily}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 32px; background: #faf7f2; border-top: 1px solid #e7e0d4;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.6;">
        ${trans.emailFrom}. 
        <a href="${params.dashboardUrl}/dashboard/settings?tab=notifications" style="color: #b45309;">
          ${trans.unsubscribeLink}
        </a> 
        ${trans.toDisable}.
      </p>
    </div>
  </div>

</body>
</html>`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const EmailTemplates = {
  buildBirthdayEmail,
  buildDeathAnniversaryEmail,
  buildCustomEventEmail,
  buildWeeklySummaryEmail,
};

export default EmailTemplates;
