/**
 * CalorieAI - AI Abstraction Layer
 * 
 * Automatically switches between OpenAI and z-ai-web-dev-sdk based on env:
 *   - If OPENAI_API_KEY is set → OpenAI (GPT-4o-mini)
 *   - Otherwise → z-ai-web-dev-sdk (sandbox only)
 */

import ZAI from 'z-ai-web-dev-sdk'
import { openai, isOpenAIConfigured, getAIModel, getVisionModel } from '@/lib/openai-client'

// ============================================
// Helper: Clean AI response (remove markdown code blocks)
// ============================================

function cleanJsonResponse(content: string): string {
  return content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

function parseJsonResponse(content: string): unknown {
  const cleaned = cleanJsonResponse(content)
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response')
  }
}

// ============================================
// 1. Analyze Food from Text Description
// ============================================

const FOOD_ANALYSIS_SYSTEM_PROMPT = `You are a professional nutritionist AI assistant. Your job is to analyze food descriptions and provide accurate nutritional estimates.

You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{
  "name": "descriptive food name",
  "calories": number,
  "protein": number_in_grams,
  "carbs": number_in_grams,
  "fat": number_in_grams,
  "fiber": number_in_grams,
  "serving": "serving size description",
  "confidence": number_between_0_and_100
}

Rules:
- Use USDA or standard nutritional databases for accuracy
- If quantity is not specified, assume a standard serving size
- Handle multiple foods by combining their nutritional values
- If the input is ambiguous, make reasonable assumptions
- Round calories to whole numbers, macros to 1 decimal place`

export async function analyzeFoodText(text: string): Promise<unknown> {
  if (isOpenAIConfigured && openai) {
    const response = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: FOOD_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: text.trim() },
      ],
      response_format: { type: 'json_object' },
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')
    return parseJsonResponse(content)
  }

  // Fallback: z-ai-web-dev-sdk
  const zai = await ZAI.create()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: FOOD_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: text.trim() },
    ],
    thinking: { type: 'disabled' },
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from AI')
  return parseJsonResponse(content)
}

// ============================================
// 2. Analyze Food from Image
// ============================================

const IMAGE_ANALYSIS_PROMPT = `You are a professional nutritionist AI. Analyze this food image and estimate its nutritional content.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "name": "descriptive food name",
  "calories": number,
  "protein": number_in_grams,
  "carbs": number_in_grams,
  "fat": number_in_grams,
  "fiber": number_in_grams,
  "serving": "estimated serving size description",
  "confidence": number_between_0_and_100
}

Rules:
- Be as accurate as possible with calorie and macro estimates
- If multiple food items are visible, combine them into one entry or pick the main dish
- Use reasonable estimates based on standard serving sizes
- Round numbers to whole numbers for calories, 1 decimal for macros`

export async function analyzeFoodImage(base64Image: string, mimeType: string): Promise<unknown> {
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`

  if (isOpenAIConfigured && openai) {
    const response = await openai.chat.completions.create({
      model: getVisionModel(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')
    return parseJsonResponse(content)
  }

  // Fallback: z-ai-web-dev-sdk
  const zai = await ZAI.create()
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
          {
            type: 'image_url',
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from AI')
  return parseJsonResponse(content)
}

// ============================================
// 3. Chat Completion (Nutrition Assistant)
// ============================================

export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  if (isOpenAIConfigured && openai) {
    const response = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      max_tokens: 1024,
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')
    return content
  }

  // Fallback: z-ai-web-dev-sdk
  const zai = await ZAI.create()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      ...messages,
    ],
    thinking: { type: 'disabled' },
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from AI')
  return content
}

// ============================================
// 4. Generate Meal Plan (JSON output)
// ============================================

export async function generateMealPlan(
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  if (isOpenAIConfigured && openai) {
    const response = await openai.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')
    return parseJsonResponse(content)
  }

  // Fallback: z-ai-web-dev-sdk
  const zai = await ZAI.create()
  const response = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    thinking: { type: 'disabled' },
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response from AI')
  return parseJsonResponse(content)
}

// ============================================
// Utility: Which AI provider is active?
// ============================================

export function getAIProvider(): 'openai' | 'z-ai-sdk' {
  return isOpenAIConfigured ? 'openai' : 'z-ai-sdk'
}