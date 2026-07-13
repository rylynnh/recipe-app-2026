const TIME_PATTERNS = [
  /(\d+)\s*分钟/,
  /(\d+)\s*分/,
  /(\d+)\s*秒/,
  /(\d+)\s*小时/,
  /(\d+)\s*h/,
  /(\d+)\s*m/,
];

export function detectDuration(content: string): number | undefined {
  for (const pattern of TIME_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (pattern.source.includes('小时') || pattern.source.includes('h')) {
        return num * 3600;
      }
      if (pattern.source.includes('秒')) {
        return num;
      }
      return num * 60;
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
