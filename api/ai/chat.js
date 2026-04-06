/**
 * HOTMESS AI Chat Endpoint
 *
 * POST /api/ai/chat
 *
 * Main conversation endpoint with:
 * - Crisis detection (immediate response)
 * - RAG retrieval (context from knowledge bases)
 * - Function calling (execute tools)
 * - Conversation history
 * - Usage logging
 */

import { createClient } from '@supabase/supabase-js';
import { requireAIAccess, logAIUsage } from './_auth.js';
import { buildSystemPrompt, detectCrisis, getCrisisResponse, buildFunctionContext } from './_system-prompt.js';
import { smartSearch, formatKnowledgeForPrompt } from './_rag.js';
import { TOOL_DEFINITIONS, executeTool } from './_tools.js';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      _supabase = createClient(url, key);
    }
  }
  return _supabase;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o';
const MAX_TOKENS = 1000;

export default async function handler(req, res) {
  const origin = req.headers?.origin || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || (origin.endsWith('.vercel.app') ? origin : 'https://hotmessldn.com');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  // Auth gate
  const access = await requireAIAccess(req, 'chat');
  if (access.error) {
    return res.status(access.status).json({
      error: access.error,
      upgradeRequired: access.upgradeRequired || false
    });
  }
  const { user, tier } = access;

  try {
    const { message, conversationId, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user context from profiles table (not dead User table)
    let userContext = null;
    const { data: profileData } = await getSupabase()
      .from('profiles')
      .select('id, display_name, username, city, public_attributes, role')
      .eq('id', user.id)
      .single();

    const attrs = profileData?.public_attributes || {};
    userContext = {
      id: user.id,
      email: user.email,
      display_name: profileData?.display_name,
      city: profileData?.city,
      interests: attrs.interests || [],
      music_taste: attrs.music_taste || [],
      tribes: attrs.tribes || [],
    };

    // 1. CRISIS DETECTION
    if (detectCrisis(message)) {
      const crisisResponse = getCrisisResponse();

      await logUsage(userContext?.id, 'crisis_detected', { message: message.slice(0, 100) });
      const convId = await saveConversation(conversationId, userContext?.id, message, crisisResponse);

      return res.status(200).json({
        response: crisisResponse,
        conversationId: convId,
        crisis: true,
        action: null
      });
    }

    // 2. GET OR CREATE CONVERSATION
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: newConv, error } = await getSupabase()
        .from('ai_conversations')
        .insert({
          user_id: userContext?.id || null,
          messages: [],
          context: context || {}
        })
        .select('id')
        .single();

      if (!error && newConv) {
        activeConversationId = newConv.id;
      }
    }

    // 3. RAG RETRIEVAL
    const searchResults = await smartSearch(message, userContext || {});
    const ragContext = formatKnowledgeForPrompt(searchResults);

    // 4. BUILD SYSTEM PROMPT
    const systemPrompt = buildSystemPrompt(userContext, context);
    const fullSystemPrompt = ragContext
      ? `${systemPrompt}\n\n${ragContext}`
      : systemPrompt;

    // 5. GET CONVERSATION HISTORY
    let conversationHistory = [];
    if (activeConversationId) {
      const { data: conv } = await getSupabase()
        .from('ai_conversations')
        .select('messages')
        .eq('id', activeConversationId)
        .single();

      if (conv?.messages) {
        conversationHistory = conv.messages.slice(-10);
      }
    }

    // 6. BUILD MESSAGES ARRAY
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // 7. CALL OPENAI WITH FUNCTION CALLING
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: MAX_TOKENS,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI API Error:', error);
      return res.status(500).json({ error: 'AI service error', details: error });
    }

    const completion = await openaiResponse.json();
    const assistantMessage = completion.choices[0]?.message;

    // 8. HANDLE TOOL CALLS
    let action = null;
    let toolResults = [];

    if (assistantMessage.tool_calls?.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        const result = await executeTool(toolName, toolArgs, userContext || {});
        toolResults.push({ tool: toolName, args: toolArgs, result });

        if (result.action) {
          action = { type: result.action, ...result };
        }
      }

      if (toolResults.length > 0) {
        const toolResultsMessages = toolResults.map((tr, idx) => ({
          role: 'tool',
          tool_call_id: assistantMessage.tool_calls[idx].id,
          content: JSON.stringify(tr.result)
        }));

        const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [...messages, assistantMessage, ...toolResultsMessages],
            max_tokens: MAX_TOKENS,
            temperature: 0.7
          })
        });

        if (followUpResponse.ok) {
          const followUpCompletion = await followUpResponse.json();
          const finalResponse = followUpCompletion.choices[0]?.message?.content;

          const convId = await saveConversation(
            activeConversationId,
            userContext?.id,
            message,
            finalResponse,
            { toolCalls: toolResults }
          );

          await logAIUsage(userContext?.id, 'chat', tier, completion.usage?.total_tokens, 'gpt-4o');
          await logUsage(userContext?.id, 'chat_with_tools', {
            intent: searchResults.intent,
            tools: toolResults.map(t => t.tool)
          });

          return res.status(200).json({
            response: finalResponse,
            conversationId: convId,
            action,
            toolResults: toolResults.map(t => ({ tool: t.tool, result: t.result }))
          });
        }
      }
    }

    // 9. RETURN RESPONSE (no tool calls)
    const responseText = assistantMessage.content;
    const convId = await saveConversation(activeConversationId, userContext?.id, message, responseText);

    await logAIUsage(userContext?.id, 'chat', tier, completion.usage?.total_tokens, 'gpt-4o');
    await logUsage(userContext?.id, 'chat', { intent: searchResults.intent });

    return res.status(200).json({
      response: responseText,
      conversationId: convId,
      action,
      context: { intent: searchResults.intent }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

async function saveConversation(conversationId, userId, userMessage, assistantResponse, metadata = {}) {
  const newMessages = [
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantResponse, ...metadata }
  ];

  if (conversationId) {
    const { data: existing } = await getSupabase()
      .from('ai_conversations')
      .select('messages')
      .eq('id', conversationId)
      .single();

    const updatedMessages = [...(existing?.messages || []), ...newMessages];

    await getSupabase()
      .from('ai_conversations')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return conversationId;
  }

  const { data: newConv, error } = await getSupabase()
    .from('ai_conversations')
    .insert({ user_id: userId, messages: newMessages })
    .select('id')
    .single();

  if (error) return null;
  return newConv?.id || null;
}

async function logUsage(userId, actionType, metadata = {}) {
  try {
    await getSupabase()
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        metadata,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    // Non-blocking
  }
}
