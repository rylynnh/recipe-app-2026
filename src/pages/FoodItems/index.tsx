import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { useFoodItemsStore } from '../../store/foodItems';
import Empty from '../../components/Empty';

export function FoodItems() {
  const navigate = useNavigate();
  const { foodItems, addFoodItem, updateFoodItem, deleteFoodItem } = useFoodItemsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<typeof foodItems[0] | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    nutritionPer100g: {
      kcal: 0,
      protein: 0,
      fat: 0,
      carb: 0,
    },
  });

  const filteredItems = foodItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name) return;

    if (editingItem) {
      updateFoodItem(editingItem.id, formData);
    } else {
      addFoodItem(formData);
    }

    setFormData({
      name: '',
      nutritionPer100g: { kcal: 0, protein: 0, fat: 0, carb: 0 },
    });
    setEditingItem(null);
    setShowAddModal(false);
  };

  const handleEdit = (item: typeof foodItems[0]) => {
    setFormData({
      name: item.name,
      nutritionPer100g: { ...item.nutritionPer100g },
    });
    setEditingItem(item);
    setShowAddModal(true);
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
        <h1 className="font-display text-xl font-medium text-primary">食材营养库</h1>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ name: '', nutritionPer100g: { kcal: 0, protein: 0, fat: 0, carb: 0 } });
            setShowAddModal(true);
          }}
          className="p-2 ml-auto hover:bg-divider/50 rounded-full transition-colors text-accent"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <main className="px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索食材..."
            className="w-full pl-10 pr-4 py-3 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {filteredItems.length === 0 ? (
          <Empty
            title={searchQuery ? '未找到食材' : '暂无食材'}
            description={searchQuery ? '尝试其他关键词' : '点击右上角添加食材'}
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-display text-base font-medium text-primary">{item.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-xs text-accent px-2 py-1 hover:bg-accent/10 rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => deleteFoodItem(item.id)}
                      className="text-xs text-danger px-2 py-1 hover:bg-danger/10 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="font-mono-digit text-sm text-primary">{item.nutritionPer100g.kcal}</div>
                    <div className="text-xs text-secondary">kcal</div>
                  </div>
                  <div>
                    <div className="font-mono-digit text-sm text-primary">{item.nutritionPer100g.protein}</div>
                    <div className="text-xs text-secondary">蛋白质</div>
                  </div>
                  <div>
                    <div className="font-mono-digit text-sm text-primary">{item.nutritionPer100g.fat}</div>
                    <div className="text-xs text-secondary">脂肪</div>
                  </div>
                  <div>
                    <div className="font-mono-digit text-sm text-primary">{item.nutritionPer100g.carb}</div>
                    <div className="text-xs text-secondary">碳水</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-card p-6 w-full max-w-sm sm:max-w-md">
            <h3 className="font-display text-lg font-medium text-primary mb-4">
              {editingItem ? '编辑食材' : '添加食材'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">食材名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">热量 (kcal/100g)</label>
                  <input
                    type="number"
                    value={formData.nutritionPer100g.kcal}
                    onChange={(e) => setFormData({ ...formData, nutritionPer100g: { ...formData.nutritionPer100g, kcal: Number(e.target.value) } })}
                    className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">蛋白质 (g)</label>
                  <input
                    type="number"
                    value={formData.nutritionPer100g.protein}
                    onChange={(e) => setFormData({ ...formData, nutritionPer100g: { ...formData.nutritionPer100g, protein: Number(e.target.value) } })}
                    className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">脂肪 (g)</label>
                  <input
                    type="number"
                    value={formData.nutritionPer100g.fat}
                    onChange={(e) => setFormData({ ...formData, nutritionPer100g: { ...formData.nutritionPer100g, fat: Number(e.target.value) } })}
                    className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">碳水 (g)</label>
                  <input
                    type="number"
                    value={formData.nutritionPer100g.carb}
                    onChange={(e) => setFormData({ ...formData, nutritionPer100g: { ...formData.nutritionPer100g, carb: Number(e.target.value) } })}
                    className="w-full px-4 py-2 bg-background text-primary rounded-input focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
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
