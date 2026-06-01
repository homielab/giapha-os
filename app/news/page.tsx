TypeScript
import { supabase } from '@/lib/supabase';

export default async function NewsPage() {
  const { data: news } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-green-800">Tin tức Dòng họ</h1>
        <p className="text-gray-500">Cập nhật những hoạt động mới nhất từ Viện và Dòng họ</p>
      </div>
      
      <div className="grid gap-6">
        {!news || news.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
            <p className="text-gray-500 italic">Hiện tại chưa có bản tin nào được đăng.</p>
          </div>
        ) : (
          news.map((item) => (
            <div key={item.id} className="border-l-4 border-green-600 bg-white p-6 rounded-r-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{item.title}</h2>
              <div className="text-gray-400 text-sm mb-4 flex items-center gap-2">
                <span>📅 {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                {item.author && <span>• Tác giả: {item.author}</span>}
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{item.content || item.summary}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
