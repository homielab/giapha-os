export interface FooterProps {
  className?: string;
  showDisclaimer?: boolean;
  pageViewCount?: number;
}

export default function Footer({
  className = "",
  showDisclaimer = false,
  pageViewCount,
}: FooterProps) {
  return (
    <footer
      className={`py-5 text-center text-sm text-stone-500 ${className} backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4">
        {showDisclaimer && (
          <p className="mb-2 text-xs tracking-wide bg-amber-50 inline-block px-3 py-1 rounded-full text-amber-800/80 border border-amber-200/50">
            Nội dung có thể thiếu sót. Vui lòng đóng góp để gia phả chính xác hơn ạ.
          </p>
        )}
        <p className="text-center opacity-80 mb-0"> Liên hệ em/cháu Hiệp: 0337367127 (Zalo).</p>
        <p className="text-center opacity-80 mb-0"> {pageViewCount != null && (
          <span>
            Số  lượt truy cập: {pageViewCount.toLocaleString("vi-VN")}
          </span>
        )} </p>
      </div>
    </footer>
  );
}
