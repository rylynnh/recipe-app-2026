import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Eye, Clock } from 'lucide-react';
import { useRecipesStore } from '../../store/recipes';
import Empty from '../../components/Empty';

export function Review() {
  const navigate = useNavigate();
  const { reviewItems, approveRecipe: approveReview, rejectRecipe: rejectReview } = useRecipesStore();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
        <button
          onClick={() => navigate('/mine')}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-xl font-medium text-primary">待校对队列</h1>
        <div className="ml-auto text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
          {reviewItems.length} 条待处理
        </div>
      </header>

      <main className="px-4 py-4">
        {reviewItems.length === 0 ? (
          <Empty title="暂无待校对" description="所有导入的菜谱都已校对完成" />
        ) : (
          <div className="space-y-4">
            {reviewItems.map((item) => (
              <div key={item.id} className="card">
                <div className="p-4 border-b border-divider">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-lg font-medium text-primary">
                      {item.parsedData.title}
                    </h3>
                    <span className="text-xs text-secondary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.parsedData.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-background text-secondary rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-primary mb-2">识别结果</h4>
                    <div className="space-y-2">
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-secondary mb-1">食材 ({item.parsedData.ingredients?.length || 0}种)</p>
                        <p className="text-sm text-primary">
                          {item.parsedData.ingredients?.slice(0, 3).map((i: any) => `${i.name} ${i.amount}${i.unit}`).join(', ') || '无'}
                          {item.parsedData.ingredients?.length > 3 && '...'}
                        </p>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-secondary mb-1">步骤 ({item.parsedData.steps?.length || 0}步)</p>
                        <p className="text-sm text-primary line-clamp-2">
                          {item.parsedData.steps?.slice(0, 2).map((s: any) => s.content).join('；') || '无'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {item.sourceSnapshot && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-primary mb-2">来源截图</h4>
                      <div className="w-full rounded-lg overflow-hidden">
                        <img
                          src={item.sourceSnapshot}
                          alt="来源截图"
                          className="w-full h-auto max-h-48 object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => rejectReview(item.id)}
                      className="flex-1 py-2 bg-background text-secondary rounded-input hover:bg-divider/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>删除</span>
                    </button>
                    <button
                      onClick={() => approveReview(item.id)}
                      className="flex-1 py-2 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>确认导入</span>
                    </button>
                    <button
                      onClick={() => navigate(`/add?type=review&id=${item.id}`)}
                      className="px-4 py-2 bg-divider/30 text-primary rounded-input hover:bg-divider/50 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}