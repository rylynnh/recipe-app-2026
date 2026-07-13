import { Ingredient, FoodItem, Nutrition, UnitConversion } from '../types';

export function parseIngredients(text: string): { name: string; amount: number; unit: string }[] {
  const lines = text.split('\n').filter((line) => line.trim());
  const ingredients: { name: string; amount: number; unit: string }[] = [];
  
  const ingredientPattern = /^([\u4e00-\u9fa5a-zA-Z\s]+?)\s+(\d+(?:\.\d+)?)\s+([a-zA-Z\u4e00-\u9fa5]+)$/;
  
  lines.forEach((line) => {
    const match = line.match(ingredientPattern);
    if (match) {
      ingredients.push({
        name: match[1].trim(),
        amount: parseFloat(match[2]),
        unit: match[3].trim(),
      });
    } else {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const secondLast = parts[parts.length - 2];
        const amount = parseFloat(secondLast);
        if (!isNaN(amount)) {
          ingredients.push({
            name: parts.slice(0, -2).join(' '),
            amount,
            unit: lastPart,
          });
        }
      }
    }
  });
  
  return ingredients;
}

export function detectDurationInText(text: string): number {
  const patterns = [
    /(\d+)\s*小时/,
    /(\d+)\s*h/,
    /(\d+)\s*分钟/,
    /(\d+)\s*分/,
    /(\d+)\s*秒/,
    /(\d+)\s*s/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (pattern.source.includes('小时') || pattern.source.includes('h')) {
        return num * 3600;
      }
      if (pattern.source.includes('秒') || pattern.source.includes('s')) {
        return num;
      }
      return num * 60;
    }
  }
  
  return 0;
}

export function parsePastedText(text: string): {
  title: string;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: string[];
} {
  const lines = text.split('\n').filter((line) => line.trim());
  
  let title = '';
  const ingredients: { name: string; amount: number; unit: string }[] = [];
  const steps: string[] = [];
  
  let inIngredients = false;
  let inSteps = false;
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    if (trimmed.match(/^(食材|材料|配料)/)) {
      inIngredients = true;
      inSteps = false;
      return;
    }
    
    if (trimmed.match(/^(步骤|做法|制作)/)) {
      inIngredients = false;
      inSteps = true;
      return;
    }
    
    if (trimmed.match(/^\d+\./) || trimmed.match(/^(第一步|第二步)/)) {
      inIngredients = false;
      inSteps = true;
      steps.push(trimmed.replace(/^\d+\.\s*/, '').replace(/^(第[一二三四五六七八九十]+步)\s*/, ''));
      return;
    }
    
    if (inIngredients) {
      const parsed = parseIngredients(trimmed);
      ingredients.push(...parsed);
      return;
    }
    
    if (inSteps) {
      steps.push(trimmed);
      return;
    }
    
    if (!title) {
      title = trimmed;
    }
  });
  
  return { title, ingredients, steps };
}

const GENERAL_CONVERSIONS: Record<string, number> = {
  'g': 1,
  '克': 1,
  'kg': 1000,
  '千克': 1000,
  'ml': 1,
  '毫升': 1,
  'l': 1000,
  '升': 1000,
  '勺': 15,
  '茶匙': 5,
  '汤匙': 15,
  '杯': 240,
  '碗': 250,
  '把': 30,
  '根': 100,
  '个': 100,
  '片': 10,
  '段': 50,
  '瓣': 5,
  '朵': 20,
  '块': 100,
  '盒': 200,
  '滴': 0.05,
};

export function convertToGrams(
  amount: number,
  unit: string,
  foodItemName: string,
  foodItems: FoodItem[],
  unitConversions: UnitConversion[]
): number {
  if (unit === 'g' || unit === '克') {
    return amount;
  }

  const foodItem = foodItems.find(f => f.name.includes(foodItemName) || foodItemName.includes(f.name));
  if (foodItem) {
    const foodSpecificConversion = unitConversions.find(
      u => u.foodItemId === foodItem.id && u.unit === unit
    );
    if (foodSpecificConversion) {
      return amount * foodSpecificConversion.gramsEquivalent;
    }
  }

  const generalConversion = GENERAL_CONVERSIONS[unit];
  if (generalConversion) {
    return amount * generalConversion;
  }

  return amount * 100;
}

// Extract base name from food database entries like "牛肉（代表值，fat 9g）" → "牛肉"
function getBaseFoodName(name: string): string {
  return name.replace(/[\[（(].*$/, '').trim();
}

// Remove common ingredient modifiers/suffixes to get core ingredient name
function getCoreIngredientName(name: string): string {
  const suffixes = ['末', '碎', '粉', '膏', '片', '粒', '丁', '丝', '块', '条', '段', '瓣', '泥', '汁', '酱', '油', '水'];
  let result = name;
  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  // Also strip leading descriptors like "罐装", "新鲜", etc.
  const prefixes = ['罐装', '罐头', '新鲜', '冷冻', '干', '鲜'];
  for (const prefix of prefixes) {
    if (result.startsWith(prefix)) {
      result = result.slice(prefix.length);
      break;
    }
  }
  return result.trim();
}

// Character-level overlap score between two strings
function charOverlapScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  let overlap = 0;
  const used = new Set<number>();
  for (let i = 0; i < shorter.length; i++) {
    for (let j = 0; j < longer.length; j++) {
      if (!used.has(j) && shorter[i] === longer[j]) {
        overlap++;
        used.add(j);
        break;
      }
    }
  }
  return overlap / shorter.length;
}

export function calculateRecipeNutrition(
  ingredients: Ingredient[],
  foodItems: FoodItem[],
  unitConversions: UnitConversion[]
): { nutritionPer100g: Nutrition; totalWeight: number; totalNutrition: Nutrition } {
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let totalWeight = 0;

  ingredients.forEach(ing => {
    const weightInGrams = convertToGrams(ing.amount, ing.unit, ing.name, foodItems, unitConversions);
    
    let foodItem: FoodItem | undefined;
    if (ing.linkedFoodItemId) {
      foodItem = foodItems.find(f => f.id === ing.linkedFoodItemId);
    }
    if (!foodItem) {
      const ingBase = getBaseFoodName(ing.name);
      const ingCore = getCoreIngredientName(ingBase);
      
      // Tier 1: Exact base-name match
      foodItem = foodItems.find(f => getBaseFoodName(f.name) === ingBase);
      
      // Tier 2: Core ingredient matches food base name
      if (!foodItem && ingCore.length >= 2) {
        foodItem = foodItems.find(f => getBaseFoodName(f.name) === ingCore);
      }
      
      // Tier 3: Substring containment (both directions)
      if (!foodItem && ingBase.length >= 2) {
        foodItem = foodItems.find(f => {
          const fBase = getBaseFoodName(f.name);
          if (fBase.length < 2) return false;
          return ingBase.includes(fBase) || fBase.includes(ingBase);
        });
      }
      
      // Tier 4: Fuzzy character overlap scoring
      if (!foodItem && ingBase.length >= 2) {
        let bestMatch: FoodItem | undefined;
        let bestScore = 0;
        for (const f of foodItems) {
          const fBase = getBaseFoodName(f.name);
          if (fBase.length < 2) continue;
          const score = charOverlapScore(ingBase, fBase);
          if (score > bestScore && score >= 0.5) {
            bestScore = score;
            bestMatch = f;
          }
        }
        foodItem = bestMatch;
      }
    }

    if (foodItem && weightInGrams) {
      const factor = weightInGrams / 100;
      totalKcal += foodItem.nutritionPer100g.kcal * factor;
      totalProtein += foodItem.nutritionPer100g.protein * factor;
      totalFat += foodItem.nutritionPer100g.fat * factor;
      totalCarbs += foodItem.nutritionPer100g.carb * factor;
      totalWeight += weightInGrams;
    }
  });

  const per100gFactor = totalWeight > 0 ? 100 / totalWeight : 0;

  return {
    nutritionPer100g: {
      kcal: Math.round(totalKcal * per100gFactor),
      protein: Math.round(totalProtein * per100gFactor * 10) / 10,
      fat: Math.round(totalFat * per100gFactor * 10) / 10,
      carb: Math.round(totalCarbs * per100gFactor * 10) / 10,
    },
    totalWeight: Math.round(totalWeight),
    totalNutrition: {
      kcal: Math.round(totalKcal),
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      carb: Math.round(totalCarbs * 10) / 10,
    },
  };
}

export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  targetServings: number
): Ingredient[] {
  const ratio = targetServings / originalServings;
  return ingredients.map(ing => ({
    ...ing,
    amount: Math.round(ing.amount * ratio * 100) / 100,
  }));
}

export function formatAmount(amount: number): string {
  if (Number.isInteger(amount)) {
    return amount.toString();
  }
  return amount.toFixed(amount < 1 ? 2 : 1);
}
