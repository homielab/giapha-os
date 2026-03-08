/**
 * Email Templates Test Suite
 * Tests for multilingual reminder email templates
 */

import {
  buildBirthdayEmail,
  buildDeathAnniversaryEmail,
  buildCustomEventEmail,
  buildWeeklySummaryEmail,
} from "@/utils/email/templates";

describe("Email Templates", () => {
  // ========== COMMON TEST DATA ==========
  const mockParams = {
    language: "vi" as const,
    familyName: "Gia Đình Nguyễn",
    personName: "Nguyễn Văn A",
    dateLabel: "15/03",
    lunarMonth: 2,
    lunarDay: 10,
    daysUntil: 3,
    dashboardUrl: "https://giapha.app",
  };

  // ========== BIRTHDAY TEMPLATES ==========

  describe("buildBirthdayEmail", () => {
    test("should generate valid birthday email for Vietnamese", () => {
      const result = buildBirthdayEmail(mockParams);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result.subject).toContain("Sinh nhật");
      expect(result.subject).toContain("Nguyễn Văn A");
      expect(result.html).toContain("🎂");
      expect(result.html).toContain("#b45309"); // Birthday amber color
    });

    test("should include lunar date in birthday email", () => {
      const result = buildBirthdayEmail(mockParams);
      expect(result.html).toContain("Âm lịch");
      expect(result.html).toContain("10");
      expect(result.html).toContain("2");
    });

    test("should include days until event", () => {
      const result = buildBirthdayEmail(mockParams);
      expect(result.html).toContain("3 ngày nữa"); // Vietnamese: "3 days from now"
    });

    test("should include dashboard link", () => {
      const result = buildBirthdayEmail(mockParams);
      expect(result.html).toContain("https://giapha.app/dashboard");
      expect(result.html).toContain("Xem gia phả");
    });

    test("should include unsubscribe link", () => {
      const result = buildBirthdayEmail(mockParams);
      expect(result.html).toContain("cài đặt");
      expect(result.html).toContain("để tắt thông báo");
    });

    test("should handle today birthdays", () => {
      const result = buildBirthdayEmail({ ...mockParams, daysUntil: 0 });
      expect(result.html).toContain("Hôm nay");
    });

    test("should handle tomorrow birthdays", () => {
      const result = buildBirthdayEmail({ ...mockParams, daysUntil: 1 });
      expect(result.html).toContain("Ngày mai");
    });

    test("should support English language", () => {
      const result = buildBirthdayEmail({ ...mockParams, language: "en" });
      expect(result.subject).toContain("Birthday");
      expect(result.html).toContain("Birthday");
      expect(result.html).toContain("in 3 days");
    });

    test("should support Chinese language", () => {
      const result = buildBirthdayEmail({ ...mockParams, language: "zh" });
      expect(result.subject).toContain("生日");
      expect(result.html).toContain("生日");
      expect(result.html).toContain("3天后");
    });

    test("should handle missing lunar date gracefully", () => {
      const result = buildBirthdayEmail({
        ...mockParams,
        lunarMonth: undefined,
        lunarDay: undefined,
      });
      expect(result.html).not.toContain("Âm lịch");
    });

    test("should be valid HTML", () => {
      const result = buildBirthdayEmail(mockParams);
      expect(result.html).toMatch(/^<!DOCTYPE html>/);
      expect(result.html).toContain("<html");
      expect(result.html).toContain("</html>");
    });
  });

  // ========== DEATH ANNIVERSARY TEMPLATES ==========

  describe("buildDeathAnniversaryEmail", () => {
    test("should generate valid death anniversary email", () => {
      const result = buildDeathAnniversaryEmail(mockParams);

      expect(result.subject).toContain("Ngày giỗ");
      expect(result.subject).toContain("Nguyễn Văn A");
      expect(result.html).toContain("🕯️");
      expect(result.html).toContain("#6b5c3e"); // Death dark brown color
    });

    test("should include lunar date for death anniversary", () => {
      const result = buildDeathAnniversaryEmail(mockParams);
      expect(result.html).toContain("Âm lịch");
    });

    test("should support multiple languages", () => {
      const enResult = buildDeathAnniversaryEmail({ ...mockParams, language: "en" });
      expect(enResult.subject).toContain("Death Anniversary");

      const zhResult = buildDeathAnniversaryEmail({ ...mockParams, language: "zh" });
      expect(zhResult.subject).toContain("忌日");
    });

    test("should be valid HTML", () => {
      const result = buildDeathAnniversaryEmail(mockParams);
      expect(result.html).toMatch(/^<!DOCTYPE html>/);
    });
  });

  // ========== CUSTOM EVENT TEMPLATES ==========

  describe("buildCustomEventEmail", () => {
    test("should generate valid custom event email", () => {
      const result = buildCustomEventEmail({
        ...mockParams,
        eventName: "Kỷ niệm cưới",
      });

      expect(result.subject).toContain("Kỷ niệm cưới");
      expect(result.html).toContain("📅");
      expect(result.html).toContain("#059669"); // Custom green color
    });

    test("should use date label as fallback for event name", () => {
      const result = buildCustomEventEmail(mockParams);
      expect(result.subject).toContain("15/03");
    });

    test("should support English and Chinese", () => {
      const enResult = buildCustomEventEmail({
        ...mockParams,
        language: "en",
        eventName: "Anniversary",
      });
      expect(enResult.html).toContain("Anniversary");

      const zhResult = buildCustomEventEmail({
        ...mockParams,
        language: "zh",
        eventName: "纪念日",
      });
      expect(zhResult.html).toContain("纪念日");
    });

    test("should be valid HTML", () => {
      const result = buildCustomEventEmail(mockParams);
      expect(result.html).toMatch(/^<!DOCTYPE html>/);
    });
  });

  // ========== WEEKLY SUMMARY TEMPLATES ==========

  describe("buildWeeklySummaryEmail", () => {
    test("should generate valid weekly summary email", () => {
      const result = buildWeeklySummaryEmail({
        ...mockParams,
        events: [
          {
            personName: "Nguyễn Văn A",
            type: "birthday",
            dateLabel: "15/03",
            daysUntil: 3,
            lunarMonth: 2,
            lunarDay: 10,
          },
          {
            personName: "Nguyễn Thị B",
            type: "death_anniversary",
            dateLabel: "20/03",
            daysUntil: 8,
          },
        ],
      });

      expect(result.subject).toContain("Các sự kiện tuần này");
      expect(result.html).toContain("📬");
      expect(result.html).toContain("Nguyễn Văn A");
      expect(result.html).toContain("Nguyễn Thị B");
      expect(result.html).toContain("🎂");
      expect(result.html).toContain("🕯️");
    });

    test("should include lunar dates in summary", () => {
      const result = buildWeeklySummaryEmail({
        ...mockParams,
        events: [
          {
            personName: "Test",
            type: "birthday",
            dateLabel: "01/01",
            daysUntil: 1,
            lunarMonth: 12,
            lunarDay: 30,
          },
        ],
      });

      expect(result.html).toContain("Âm lịch");
      expect(result.html).toContain("12");
      expect(result.html).toContain("30");
    });

    test("should support multiple languages", () => {
      const enResult = buildWeeklySummaryEmail({
        ...mockParams,
        language: "en",
        events: [{ personName: "Test", type: "birthday", dateLabel: "15/03", daysUntil: 3 }],
      });
      expect(enResult.subject).toContain("Upcoming events this week");

      const zhResult = buildWeeklySummaryEmail({
        ...mockParams,
        language: "zh",
        events: [{ personName: "Test", type: "birthday", dateLabel: "15/03", daysUntil: 3 }],
      });
      expect(zhResult.subject).toContain("本周的事件");
    });

    test("should handle empty events array", () => {
      const result = buildWeeklySummaryEmail({
        ...mockParams,
        events: [],
      });

      expect(result.html).toMatch(/^<!DOCTYPE html>/);
      expect(result.html).toContain("Gia Đình Nguyễn");
    });

    test("should be valid HTML", () => {
      const result = buildWeeklySummaryEmail({
        ...mockParams,
        events: [
          {
            personName: "Test",
            type: "birthday",
            dateLabel: "15/03",
            daysUntil: 3,
          },
        ],
      });

      expect(result.html).toMatch(/^<!DOCTYPE html>/);
      expect(result.html).toContain("<html");
      expect(result.html).toContain("</html>");
    });
  });

  // ========== GENERAL PROPERTIES ==========

  describe("General email properties", () => {
    test("all templates should have valid subject lines", () => {
      const templates = [
        buildBirthdayEmail(mockParams),
        buildDeathAnniversaryEmail(mockParams),
        buildCustomEventEmail(mockParams),
        buildWeeklySummaryEmail({
          ...mockParams,
          events: [{ personName: "Test", type: "birthday", dateLabel: "15/03", daysUntil: 3 }],
        }),
      ];

      templates.forEach((template) => {
        expect(template.subject).toBeDefined();
        expect(template.subject.length).toBeGreaterThan(0);
        expect(template.subject.length).toBeLessThan(100);
      });
    });

    test("all templates should have proper HTML structure", () => {
      const templates = [
        buildBirthdayEmail(mockParams),
        buildDeathAnniversaryEmail(mockParams),
        buildCustomEventEmail(mockParams),
      ];

      templates.forEach((template) => {
        const html = template.html;

        // Basic HTML structure
        expect(html).toMatch(/<!DOCTYPE html>/);
        expect(html).toContain("<html");
        expect(html).toContain("<head");
        expect(html).toContain("<body");
        expect(html).toContain("</body>");
        expect(html).toContain("</html>");

        // Responsive meta tag
        expect(html).toContain("viewport");

        // Character encoding
        expect(html).toContain("charset=UTF-8");
      });
    });

    test("all templates should include accessible links", () => {
      const templates = [
        buildBirthdayEmail(mockParams),
        buildDeathAnniversaryEmail(mockParams),
        buildCustomEventEmail(mockParams),
      ];

      templates.forEach((template) => {
        expect(template.html).toContain("href=");
        expect(template.html).toContain("dashboard");
      });
    });

    test("templates should include proper color scheme", () => {
      const birthday = buildBirthdayEmail(mockParams);
      const death = buildDeathAnniversaryEmail(mockParams);
      const custom = buildCustomEventEmail(mockParams);

      expect(birthday.html).toContain("#b45309"); // Amber
      expect(death.html).toContain("#6b5c3e"); // Dark brown
      expect(custom.html).toContain("#059669"); // Green
    });
  });
});
