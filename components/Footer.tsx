import { SiteSettings } from "@/types";

export interface FooterProps {
  className?: string;
  showDisclaimer?: boolean;
  settings?: SiteSettings | null;
}

export default function Footer({
  className = "",
  showDisclaimer = false,
  settings,
}: FooterProps) {
  return (
    <footer
      className={`py-8 text-center text-sm text-stone-500 ${className} backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4">
        {settings && (settings.footer_address || settings.footer_phone || settings.footer_email || settings.footer_custom_text) && (
          <div className="mb-6 pb-6 border-b border-stone-200/50">
            {settings.footer_custom_text && (
               <p className="italic text-stone-600 mb-3">{settings.footer_custom_text}</p>
            )}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs text-stone-600">
               {settings.footer_address && (
                  <span>📍 {settings.footer_address}</span>
               )}
               {settings.footer_phone && (
                  <span>📞 {settings.footer_phone}</span>
               )}
               {settings.footer_email && (
                  <span>✉️ {settings.footer_email}</span>
               )}
            </div>
          </div>
        )}

        {showDisclaimer && (
          <p className="mb-4 text-xs tracking-wide bg-amber-50 inline-block px-3 py-1 rounded-full text-amber-800/80 border border-amber-200/50">
            Nội dung có thể thiếu sót. Vui lòng đóng góp để gia phả chính xác
            hơn.
          </p>
        )}
        <p className="flex items-center justify-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <a
            href="https://github.com/homielab/giapha-os"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-stone-600 hover:text-amber-700 transition-colors inline-flex items-center gap-1.5"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            Gia phả Việt
          </a>
          by
          <a
            href="https://homielab.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#8b0000] hover:text-[#b8860b] transition-colors inline-flex items-center gap-1.5"
          >
            HomieLab
          </a>
        </p>
      </div>
    </footer>
  );
}
