import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || ''

export const isOpenAIConfigured = apiKey.length > 0

export const openai = isOpenAIConfigured
  ? new OpenAI({ apiKey })
  : null

export function getAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

export function getVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
}