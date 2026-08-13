import crypto from 'crypto';
import type { NextRequest } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isPipelineSecretValid(secret: unknown): boolean {
  const pipelineSecret = process.env.PIPELINE_SECRET;
  if (!pipelineSecret || typeof secret !== 'string' || !secret) return false;
  return safeEqual(secret, pipelineSecret);
}

function isCronAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !auth) return false;
  return auth === `Bearer ${cronSecret}`;
}

// Menerima secret dari query string (legacy), header x-pipeline-secret,
// atau body (untuk route POST), lalu fallback ke cron Authorization.
export function isPipelineRequestAuthorized(
  request: NextRequest,
  bodySecret?: unknown
): boolean {
  if (isPipelineSecretValid(request.nextUrl.searchParams.get('secret'))) return true;
  if (isPipelineSecretValid(request.headers.get('x-pipeline-secret'))) return true;
  if (isPipelineSecretValid(bodySecret)) return true;
  if (isCronAuthorized(request)) return true;
  return false;
}
