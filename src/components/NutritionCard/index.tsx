import { Nutrition } from '../../types';

interface NutritionCardProps {
  nutrition: Nutrition;
}

export function NutritionCard({ nutrition }: NutritionCardProps) {
  const items = [
    { label: '热量', value: nutrition.kcal, unit: 'kcal' },
    { label: '蛋白质', value: nutrition.protein, unit: 'g' },
    { label: '脂肪', value: nutrition.fat, unit: 'g' },
    { label: '碳水', value: nutrition.carb, unit: 'g' },
  ];

  return (
    <div className="card p-4">
      <h3 className="font-display text-lg font-medium text-primary mb-4">营养成分</h3>
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="font-mono-digit text-xl font-medium text-accent mb-1">
              {item.value}
            </div>
            <div className="text-xs text-secondary">{item.unit}</div>
            <div className="text-xs text-secondary mt-1">{item.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-secondary text-center mt-4 pt-4 border-t border-divider">
        按食材生重估算，未计入烹饪损耗，仅供参考
      </p>
    </div>
  );
}
