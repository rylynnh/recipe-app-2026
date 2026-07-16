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
    <div className="card p-5">
      <h3 className="font-display text-[17px] font-medium text-primary mb-5">营养成分<span className="text-secondary/50 text-xs font-sans ml-2">每100g</span></h3>
      <div className="grid grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="font-mono-digit text-[22px] font-semibold text-accent mb-0.5 leading-none">
              {item.value}
            </div>
            <div className="text-[11px] text-secondary/60">{item.unit}</div>
            <div className="text-[11px] text-secondary mt-1.5">{item.label}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-secondary/50 text-center mt-5 pt-4" style={{ borderTop: '0.5px solid var(--color-divider)' }}>
        按食材生重估算，未计入烹饪损耗，仅供参考
      </p>
    </div>
  );
}
