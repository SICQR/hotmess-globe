/**
 * Personas API: Visibility rules management
 * GET /api/personas/visibility?profile_id=X - List visibility rules
 * POST /api/personas/visibility - Create visibility rule
 * PATCH /api/personas/visibility?rule_id=X - Update visibility rule
 * DELETE /api/personas/visibility?rule_id=X - Delete visibility rule
 */

import { getBearerToken, json, getQueryParam, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

export default async function handler(req, res) {
  const { method } = req;

  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaErr || !anonClient) {
    return json(res, 500, { error: 'Server configuration error' });
  }

  const { user, error: authError } = await getAuthedUser({ anonClient, accessToken });
  if (authError || !user) {
    return json(res, 401, { error: 'Invalid auth token' });
  }

  const client = serviceClient || anonClient;
  const accountId = user.id;

  switch (method) {
    case 'GET':
      return handleListRules(req, res, accountId, client);
    case 'POST':
      return handleCreateRule(req, res, accountId, client);
    case 'PATCH':
      return handleUpdateRule(req, res, accountId, client);
    case 'DELETE':
      return handleDeleteRule(req, res, accountId, client);
    default:
      return json(res, 405, { error: 'Method not allowed' });
  }
}

/**
 * Verify profile ownership
 */
async function verifyProfileOwnership(profileId, accountId, client) {
  const { data: profile, error } = await client
    .from('profiles')
    .select('id, account_id')
    .eq('id', profileId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !profile) {
    return { owned: false, error: 'Profile not found' };
  }

  if (profile.account_id !== accountId) {
    return { owned: false, error: 'Access denied' };
  }

  return { owned: true, profile };
}

/**
 * GET - List visibility rules for a profile
 */
async function handleListRules(req, res, accountId, client) {
  const profileId = getQueryParam(req, 'profile_id');
  if (!profileId) {
    return json(res, 400, { error: 'profile_id is required' });
  }

  const ownership = await verifyProfileOwnership(profileId, accountId, client);
  if (!ownership.owned) {
    return json(res, 403, { error: ownership.error });
  }

  const { data: rules, error } = await client
    .from('profile_visibility_rules')
    .select('*')
    .eq('profile_id', profileId)
    .order('priority', { ascending: true });

  if (error) {
    console.error('[personas/visibility] List error:', error);
    return json(res, 500, { error: 'Failed to fetch rules' });
  }

  return json(res, 200, { rules: rules || [] });
}

/**
 * POST - Create a new visibility rule
 */
async function handleCreateRule(req, res, accountId, client) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const { profile_id, rule_type, rule_config, priority, enabled } = body;

  if (!profile_id) {
    return json(res, 400, { error: 'profile_id is required' });
  }

  if (!rule_type) {
    return json(res, 400, { error: 'rule_type is required' });
  }

  const validRuleTypes = ['PUBLIC', 'ALLOWLIST_USERS', 'BLOCKLIST_USERS', 'FILTER_VIEWER_ATTRIBUTES'];
  if (!validRuleTypes.includes(rule_type)) {
    return json(res, 400, { error: `rule_type must be one of: ${validRuleTypes.join(', ')}` });
  }

  const ownership = await verifyProfileOwnership(profile_id, accountId, client);
  if (!ownership.owned) {
    return json(res, 403, { error: ownership.error });
  }

  const ruleData = {
    profile_id,
    rule_type,
    rule_config: rule_config || {},
    priority: priority ?? 0,
    enabled: enabled !== false,
  };

  const { data: rule, error } = await client
    .from('profile_visibility_rules')
    .insert(ruleData)
    .select()
    .single();

  if (error) {
    console.error('[personas/visibility] Create error:', error);
    return json(res, 500, { error: 'Failed to create rule' });
  }

  return json(res, 201, { rule });
}

/**
 * PATCH - Update a visibility rule
 */
async function handleUpdateRule(req, res, accountId, client) {
  const ruleId = getQueryParam(req, 'rule_id');
  if (!ruleId) {
    return json(res, 400, { error: 'rule_id is required' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  // Get the rule to verify ownership
  const { data: existingRule, error: fetchError } = await client
    .from('profile_visibility_rules')
    .select('*, profiles!inner(account_id)')
    .eq('id', ruleId)
    .maybeSingle();

  if (fetchError || !existingRule) {
    return json(res, 404, { error: 'Rule not found' });
  }

  if (existingRule.profiles?.account_id !== accountId) {
    return json(res, 403, { error: 'Access denied' });
  }

  const updateData = {};
  if (body.rule_config !== undefined) updateData.rule_config = body.rule_config;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;

  if (Object.keys(updateData).length === 0) {
    return json(res, 400, { error: 'No fields to update' });
  }

  const { data: updatedRule, error: updateError } = await client
    .from('profile_visibility_rules')
    .update(updateData)
    .eq('id', ruleId)
    .select()
    .single();

  if (updateError) {
    console.error('[personas/visibility] Update error:', updateError);
    return json(res, 500, { error: 'Failed to update rule' });
  }

  return json(res, 200, { rule: updatedRule });
}

/**
 * DELETE - Delete a visibility rule
 */
async function handleDeleteRule(req, res, accountId, client) {
  const ruleId = getQueryParam(req, 'rule_id');
  if (!ruleId) {
    return json(res, 400, { error: 'rule_id is required' });
  }

  // Get the rule to verify ownership
  const { data: existingRule, error: fetchError } = await client
    .from('profile_visibility_rules')
    .select('*, profiles!inner(account_id)')
    .eq('id', ruleId)
    .maybeSingle();

  if (fetchError || !existingRule) {
    return json(res, 404, { error: 'Rule not found' });
  }

  if (existingRule.profiles?.account_id !== accountId) {
    return json(res, 403, { error: 'Access denied' });
  }

  const { error: deleteError } = await client
    .from('profile_visibility_rules')
    .delete()
    .eq('id', ruleId);

  if (deleteError) {
    console.error('[personas/visibility] Delete error:', deleteError);
    return json(res, 500, { error: 'Failed to delete rule' });
  }

  return json(res, 200, { success: true });
}
