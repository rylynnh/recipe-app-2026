const TIME_PATTERN_PAIRS: [RegExp, number][] = [
  [/(\d+)\s*小时/, 3600],
  [/(\d+)\s*h(?!ours)/i, 3600],
  [/(\d+)\s*分钟/, 60],
  [/(\d+)\s*分(?!钟)/, 60],
  [/(\d+)\s*秒/, 1],
  [/(\d+)\s*s(?!ec)/i, 1],
  [/(\d+)\s*m(?!in)/i, 60],
];

export function detectDuration(content: string): number | undefined {
  for (const [pattern, multiplier] of TIME_PATTERN_PAIRS) {
    const match = content.match(pattern);
    if (match) {
      return parseInt(match[1]) * multiplier;
    }
  }
  return undefined;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
