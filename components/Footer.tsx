export interface FooterProps {
  className?: string;
  showDisclaimer?: boolean;
}

export default function Footer({
  className = "",
  showDisclaimer = false,
}: FooterProps) {
  return (
    <footer
      className={`py-8 text-center text-sm text-stone-500 ${className} backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4">
        {showDisclaimer && (
          <p className="mb-4 text-xs tracking-wide bg-amber-50 inline-block px-3 py-1 rounded-full text-amber-800/80 border border-amber-200/50">
            Nội dung có thể thiếu sót. Vui lòng đóng góp để gia phả chính xác hơn ạ.
          </p>
        )}

        <p className="flex items-center justify-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <span> Liên hệ em/cháu Hiệp: 0337367127 (Zalo) </span>
        </p>
      </div>
    </footer>
  );
}
