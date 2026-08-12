export interface DecayPost {
  publishedAt: string;
  views?: number;
}

// Time decay: score = views / (hours_since_publish + 2)^1.5
export function decayScore(post: DecayPost): number {
  const hours = (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60);
  return (post.views || 0) / Math.pow(hours + 2, 1.5);
}
