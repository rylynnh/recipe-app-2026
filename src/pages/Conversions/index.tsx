import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useFoodItemsStore } from '../../store/foodItems';

export function Conversions() {
  const navigate = useNavigate();
  const { unitConversions, addUnitConversion, deleteUnitConversion } = useFoodItemsStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('g');
  const [ratio, setRatio] = useState(0);

  const handleSave = () => {
    if (!fromUnit || !toUnit || ratio <= 0) return;
    addUnitConversion({ unit: fromUnit, gramsEquivalent: ratio });
    setFromUnit('');
    setToUnit('g');
    setRatio(0);
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-divider flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-divider/50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display text-xl font-medium text-primary">单位换算表</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 ml-auto hover:bg-divider/50 rounded-full transition-colors text-accent"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      <main className="px-4 py-4">
        <div className="card p-4 mb-4">
          <h3 className="font-display text-base font-medium text-primary mb-3">常见换算</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '1杯', value: '240ml' },
              { label: '1汤匙', value: '15ml' },
              { label: '1茶匙', value: '5ml' },
              { label: '1盎司', value: '28g' },
              { label: '1磅', value: '454g' },
              { label: '1斤', value: '500g' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-divider/50">
                <span className="text-primary">{item.label}</span>
                <span className="font-mono-digit text-secondary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-display text-base font-medium text-primary mb-3">自定义换算</h3>
          {unitConversions.length === 0 ? (
            <div className="text-center py-8 text-secondary text-sm">
              暂无自定义换算规则
            </div>
          ) : (
            <div className="space-y-2">
              {unitConversions.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-digit text-primary">1 {conv.unit}</span>
                    <ArrowRight className="w-4 h-4 text-secondary" />
                    <span className="font-mono-digit text-accent">
                      {conv.gramsEquivalent} g
                    </span>
                  </div>
                  <button
                    onClick={() => deleteUnitConversion(conv.id)}
                    className="text-xs text-danger px-2 py-1 hover:bg-danger/10 rounded"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-card p-6 w-full max-w-sm">
            <h3 className="font-display text-lg font-medium text-primary mb-4">添加换算规则</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">源单位</label>
                <input
                  type="text"
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  placeholder="如：勺、杯、个"
                  className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">目标单位</label>
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="g">克 (g)</option>
                  <option value="ml">毫升 (ml)</option>
                  <option value="kg">千克 (kg)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">换算比例</label>
                <input
                  type="number"
                  value={ratio}
                  onChange={(e) => setRatio(Number(e.target.value))}
                  placeholder="1源单位等于多少目标单位"
                  className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-background text-secondary rounded-input hover:bg-divider/50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-accent text-white rounded-input hover:bg-accent/90 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
