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
  const patternPairs: [RegExp, number][] = [
    [/(\d+(?:\.\d+)?)\s*小时/, 3600],
    [/(\d+(?:\.\d+)?)\s*h(?!ours)/i, 3600],
    [/(\d+(?:\.\d+)?)\s*分钟/, 60],
    [/(\d+(?:\.\d+)?)\s*分(?!钟)/, 60],
    [/(\d+(?:\.\d+)?)\s*秒/, 1],
    [/(\d+(?:\.\d+)?)\s*s(?!ec)/i, 1],
  ];

  for (const [pattern, multiplier] of patternPairs) {
    const match = text.match(pattern);
    if (match) {
      return Math.round(parseFloat(match[1]) * multiplier);
    }
  }

  return 0;
}

export function parsePastedText(text: string): {
  title: string;
  ingredients: { name: string; amount: number; unit: string; group?: string }[];
  steps: string[];
} {
  // Clean OCR artifacts like "--- 图片 1 ---"
  const cleaned = text.replace(/---\s*图片\s*\d+\s*---/g, '').replace(/#{1,6}\s*/g, '');
  const lines = cleaned.split('\n').filter((line) => line.trim());

  let title = '';
  const ingredients: { name: string; amount: number; unit: string; group?: string }[] = [];
  const steps: string[] = [];

  let currentGroup: string | undefined;
  let inIngredients = false;
  let inSteps = false;
  let hasExplicitSection = false;

  // Main section headers
  const ingredientHeader = /^[\s]*[【\[]?\s*(食材|材料|配料|主料|辅料|所需食材|你需要|准备)[】\]]?\s*[:：]?\s*$/i;
  const stepHeader = /^[\s]*[【\[]?\s*(步骤|做法|制作|烹饪方法|操作|制作步骤|烹饪步骤|制作方法|操作流程)[】\]]?\s*[:：]?\s*$/i;
  const numberedStep = /^[\s]*(\d+[\.\、\)\s]|[一二三四五六七八九十]+[\.\、]\s*|第[一二三四五六七八九十\d]+步)/;

  // Action verbs that strongly indicate a step
  const stepStartVerbs = /^(先|再|然后|接着|最后|将|把|用|取|加入|放入|倒入|取出|捞出|盛出|装盘|摆盘|切|剁|拍|剥|洗|泡|煮|蒸|炒|炸|烤|煎|焖|炖|烧|卤|拌|腌|揉|捏|包|卷|叠|铺|撒|淋|浇|刷|涂|抹|搅|搅打|搅拌|混合|拌匀|翻炒|加热|烧开|煮沸|小火|大火|中火|热锅|起锅|关火|开火|转|调成|调至|静置|放置|晾凉|冷却|冷藏|冷冻|发酵|醒发|松弛|饧|均分|分成|撕成|掰成)/;

  // Known step-section keywords (these ALWAYS mean steps, not ingredient groups)
  const knownStepKeywords = ['做法', '步骤', '制作', '烹饪方法', '操作方法', '制作方法', '操作流程', '烹饪步骤'];

  // Heuristic: does this line look like an ingredient?
  const looksLikeIngredient = (line: string): boolean => {
    const trimmed = line.trim();
    if (/\d+(?:\.\d+)?\s*(?:g|克|kg|千克|ml|毫升|l|升|个|勺|茶匙|汤匙|碗|杯|片|块|根|条|颗|瓣|把|匙|只|头|段|撮|滴|圈|层|张|枚|包|袋|盒|罐|瓶|斤|两|磅|oz|lb|适量|少许|若干)/i.test(trimmed)) {
      if (trimmed.length < 35 && !stepStartVerbs.test(trimmed)) return true;
    }
    if (/(?:适量|少许|若干|一点点)$/.test(trimmed)) return true;
    return false;
  };

  // Check if a line is a sub-group header (e.g., "酱汁：", "配菜：", "香料油：")
  // Returns the group name, or null if not a sub-group header
  const isSubGroupHeader = (line: string): string | null => {
    const trimmed = line.trim();
    // Match short Chinese/English text followed by colon
    const match = trimmed.match(/^([【\[]?\s*[\u4e00-\u9fa5a-zA-Z]{1,8}\s*[】\]]?)\s*[:：]\s*(.*)$/);
    if (!match) return null;
    const headerPart = match[1].trim().replace(/[【\[\】\]]/g, '').trim();
    const afterColon = match[2].trim();

    // If it matches a known step keyword, it's NOT a sub-group header
    if (knownStepKeywords.some(kw => headerPart.includes(kw))) return null;
    // If main section header, skip
    if (ingredientHeader.test(trimmed) || stepHeader.test(trimmed)) return null;

    return headerPart;
  };

  // Parse inline ingredients from text after a group header colon
  // e.g., "配菜：黄豆芽 小油菜 大葱末 蒜末" → ["黄豆芽", "小油菜", "大葱末", "蒜末"]
  const parseInlineIngredients = (text: string, group: string): { name: string; amount: number; unit: string; group?: string }[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const results: { name: string; amount: number; unit: string; group?: string }[] = [];

    // First, check if the text contains multiple ingredients separated by punctuation (、，;)
    // If so, split and parse each part separately
    if (/[、，;]/.test(trimmed)) {
      const parts = trimmed.split(/[、，;]/).filter(s => s.trim().length > 0);
      if (parts.length > 1) {
        for (const part of parts) {
          const parsed = parseIngredientLine(part.trim(), group);
          if (parsed) {
            results.push(parsed);
          } else if (part.trim().length >= 2 && part.trim().length < 15 && !stepStartVerbs.test(part.trim())) {
            results.push({ name: part.trim(), amount: 0, unit: '', group });
          }
        }
        if (results.length > 0) return results;
      }
    }

    // Try standard parse first (name + amount + unit)
    const standardParsed = parseIngredientLine(trimmed, group);
    if (standardParsed) {
      results.push(standardParsed);
      return results;
    }

    // Split by spaces, commas, Chinese commas,顿号
    const items = trimmed.split(/[\s,，、]+/).filter(s => s.trim().length > 0);
    if (items.length <= 1) return []; // Single item without quantity — might be a step

    for (const item of items) {
      const parsed = parseIngredientLine(item.trim(), group);
      if (parsed) {
        results.push(parsed);
      } else if (item.trim().length >= 2 && item.trim().length < 15 && !stepStartVerbs.test(item.trim())) {
        // Short text without quantity — treat as ingredient with no amount
        results.push({ name: item.trim(), amount: 0, unit: '', group });
      }
    }

    return results;
  };

  // Parse a single ingredient line
  const parseIngredientLine = (line: string, group?: string): { name: string; amount: number; unit: string; group?: string } | null => {
    const trimmed = line.trim();
    // Pattern: name amount unit (e.g., "高筋粉 500g", "盐 3g", "姜 1片")
    const match = trimmed.match(/^([\u4e00-\u9fa5a-zA-Z\s\(\)（）]+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z\u4e00-\u9fa5]+)\s*$/);
    if (match) {
      return { name: match[1].trim(), amount: parseFloat(match[2]), unit: match[3].trim(), group };
    }
    // Pattern: name amount unit with space before unit (e.g., "陈醋 30 g")
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const secondLast = parts[parts.length - 2];
      const amount = parseFloat(secondLast);
      if (!isNaN(amount)) {
        return { name: parts.slice(0, -2).join(' '), amount, unit: lastPart, group };
      }
    }
    // Pattern: name + "适量/少许" (e.g., "盐 适量")
    const amountMatch = trimmed.match(/^([\u4e00-\u9fa5a-zA-Z\s\(\)（）]+?)\s+(适量|少许|若干)$/);
    if (amountMatch) {
      return { name: amountMatch[1].trim(), amount: 0, unit: amountMatch[2], group };
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || /^[-=_]{3,}$/.test(trimmed)) continue;

    // Check for main ingredient section header
    if (ingredientHeader.test(trimmed) || trimmed.match(/^(食材|材料|配料|主料|辅料|所需食材)\s*[:：]?\s*$/)) {
      inIngredients = true;
      inSteps = false;
      hasExplicitSection = true;
      currentGroup = undefined;
      continue;
    }

    // Check for main step section header
    if (stepHeader.test(trimmed) || trimmed.match(/^(步骤|做法|制作|烹饪方法|制作方法|操作流程)\s*[:：]?\s*$/)) {
      inIngredients = false;
      inSteps = true;
      hasExplicitSection = true;
      currentGroup = undefined;
      continue;
    }

    // Check for numbered step
    if (numberedStep.test(trimmed)) {
      inIngredients = false;
      inSteps = true;
      hasExplicitSection = true;
      const stepContent = trimmed
        .replace(/^\d+[\.\、\)\s]\s*/, '')
        .replace(/^(第[一二三四五六七八九十\d]+步)[\.\、\s]*/, '');
      if (stepContent.trim()) steps.push(stepContent.trim());
      continue;
    }

    // Check for sub-group header (e.g., "酱汁：", "配菜：", "香料油：")
    const subGroup = isSubGroupHeader(trimmed);
    if (subGroup !== null) {
      // Extract inline content after the colon
      const afterColonMatch = trimmed.match(/^[^:：]*[:：]\s*(.+)$/);
      const afterColon = afterColonMatch ? afterColonMatch[1].trim() : '';

      if (afterColon) {
        // There's content after the colon — try to parse as inline ingredients
        const inlineIngs = parseInlineIngredients(afterColon, subGroup);
        if (inlineIngs.length > 0) {
          ingredients.push(...inlineIngs);
          currentGroup = subGroup;
          inIngredients = true;
          inSteps = false;
          continue;
        }
      }

      // No inline content or couldn't parse as ingredients — check next line
      const nextLine = lines[i + 1]?.trim() || '';
      if (looksLikeIngredient(nextLine) || parseIngredientLine(nextLine)) {
        currentGroup = subGroup;
        inIngredients = true;
        inSteps = false;
        continue;
      }

      // If next line starts with action verbs or is long, this might be a step header
      if (stepStartVerbs.test(nextLine) || nextLine.length > 25) {
        // Treat this whole thing as a step
        steps.push(trimmed);
        continue;
      }

      // Default: treat as ingredient group header, wait for next lines
      currentGroup = subGroup;
      inIngredients = true;
      inSteps = false;
      continue;
    }

    // If in ingredients section
    if (inIngredients) {
      // First, check if the line contains multiple ingredients separated by punctuation
      if (/[、，;]/.test(trimmed)) {
        const parts = trimmed.split(/[、，;]/).filter(s => s.trim().length > 0);
        if (parts.length > 1) {
          let parsedAny = false;
          for (const part of parts) {
            const parsed = parseIngredientLine(part.trim(), currentGroup);
            if (parsed) {
              ingredients.push(parsed);
              parsedAny = true;
            } else if (part.trim().length >= 2 && part.trim().length < 15 && !stepStartVerbs.test(part.trim())) {
              ingredients.push({ name: part.trim(), amount: 0, unit: '', group: currentGroup });
              parsedAny = true;
            }
          }
          if (parsedAny) continue;
        }
      }

      // Try to parse as ingredient (with quantity)
      const parsed = parseIngredientLine(trimmed, currentGroup);
      if (parsed) {
        ingredients.push(parsed);
        continue;
      }

      // Check if this is another sub-group header on its own line
      const innerSubGroup = isSubGroupHeader(trimmed);
      if (innerSubGroup !== null) {
        currentGroup = innerSubGroup;
        continue;
      }

      // If it doesn't look like an ingredient, might be a step
      if (stepStartVerbs.test(trimmed) || trimmed.length > 25) {
        inIngredients = false;
        inSteps = true;
        steps.push(trimmed);
        continue;
      }

      // Short text without quantity in ingredient section — could be inline ingredient list
      // e.g., "黄豆芽 小油菜 大葱末 蒜末"
      const inlineItems = trimmed.split(/[\s,，、]+/).filter(s => s.trim().length > 0);
      if (inlineItems.length >= 2 && inlineItems.every(item => item.length < 15 && !stepStartVerbs.test(item))) {
        for (const item of inlineItems) {
          if (item.length >= 2) {
            ingredients.push({ name: item.trim(), amount: 0, unit: '', group: currentGroup });
          }
        }
        continue;
      }
    }

    // If in steps section
    if (inSteps) {
      // Check if this is actually a sub-group header followed by ingredients
      const stepSubGroup = isSubGroupHeader(trimmed);
      if (stepSubGroup !== null) {
        const afterColonMatch = trimmed.match(/^[^:：]*[:：]\s*(.+)$/);
        const afterColon = afterColonMatch ? afterColonMatch[1].trim() : '';
        const nextLine = lines[i + 1]?.trim() || '';

        if ((afterColon && parseInlineIngredients(afterColon, stepSubGroup).length > 0) ||
            (looksLikeIngredient(nextLine) || parseIngredientLine(nextLine))) {
          inSteps = false;
          inIngredients = true;
          currentGroup = stepSubGroup;
          // Re-process this line as sub-group header
          if (afterColon) {
            const inlineIngs = parseInlineIngredients(afterColon, stepSubGroup);
            if (inlineIngs.length > 0) {
              ingredients.push(...inlineIngs);
            }
          }
          continue;
        }
      }
      steps.push(trimmed);
      continue;
    }

    // No section detected yet — auto-detect
    if (!hasExplicitSection) {
      if (looksLikeIngredient(trimmed)) {
        inIngredients = true;
        hasExplicitSection = true;
        const parsed = parseIngredientLine(trimmed);
        if (parsed) ingredients.push(parsed);
        continue;
      }

      const autoSubGroup = isSubGroupHeader(trimmed);
      if (autoSubGroup !== null) {
        const nextLine = lines[i + 1]?.trim() || '';
        if (looksLikeIngredient(nextLine) || parseIngredientLine(nextLine)) {
          inIngredients = true;
          hasExplicitSection = true;
          currentGroup = autoSubGroup;
          continue;
        }
      }

      if (!title) {
        if (/^来[源自]|^转[载自]|^http|^#|^@/.test(trimmed)) continue;
        title = trimmed;
        continue;
      }

      if (stepStartVerbs.test(trimmed) || trimmed.length > 20) {
        inSteps = true;
        hasExplicitSection = true;
        steps.push(trimmed);
        continue;
      }
    }
  }

  // Fallback: if no steps found but we have content, treat non-ingredient lines as steps
  if (steps.length === 0 && ingredients.length > 0) {
    for (const line of lines) {
      const t = line.trim();
      if (t === title) continue;
      if (looksLikeIngredient(t)) continue;
      if (ingredientHeader.test(t) || stepHeader.test(t)) continue;
      if (isSubGroupHeader(t) !== null) continue;
      if (parseIngredientLine(t)) continue;
      // Check inline items
      const inlineItems = t.split(/[\s,，、]+/).filter(s => s.trim().length > 0);
      if (inlineItems.length >= 2 && inlineItems.every(item => item.length < 15 && !stepStartVerbs.test(item))) continue;
      if (t.length > 5 && !/^\d+$/.test(t)) {
        steps.push(t);
      }
    }
  }

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
