/**
 * Domain Git Mappings API
 * Handles CRUD operations for domain-to-git-branch assignments
 */

import { createClient } from '@supabase/supabase-js';

// Helper functions
function json(res, status, body) {
  res.status(status).json(body);
}

function getEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return null;
  }
  return auth.slice(7);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function validateDomain(domain) {
  // Basic domain validation
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

function validateBranchName(branch) {
  // Git branch name validation - simplified
  if (!branch || branch.length === 0 || branch.length > 255) {
    return false;
  }
  // Disallow special characters that are invalid in git branch names
  const invalidChars = /[\s~^:?*\[\\]/;
  return !invalidChars.test(branch);
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get and verify authentication token
    const token = getBearerToken(req);
    if (!token) {
      return json(res, 401, { error: 'Unauthorized: No token provided' });
    }

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json(res, 401, { error: 'Unauthorized: Invalid token' });
    }

    const userId = user.id;
    const userEmail = user.email;

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        // List all domain mappings for the authenticated user
        const { data, error } = await supabase
          .from('domain_git_mappings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching domain mappings:', error);
          return json(res, 500, { error: 'Failed to fetch domain mappings' });
        }

        return json(res, 200, { data });
      }

      case 'POST': {
        // Create a new domain mapping
        const body = await readJsonBody(req);
        const { domain, git_branch, environment = 'preview' } = body;

        // Validate inputs
        if (!domain || !git_branch) {
          return json(res, 400, { error: 'Domain and git_branch are required' });
        }

        if (!validateDomain(domain)) {
          return json(res, 400, { error: 'Invalid domain format' });
        }

        if (!validateBranchName(git_branch)) {
          return json(res, 400, { error: 'Invalid git branch name' });
        }

        if (!['production', 'preview'].includes(environment)) {
          return json(res, 400, { error: 'Environment must be either "production" or "preview"' });
        }

        // Insert new mapping
        const { data, error } = await supabase
          .from('domain_git_mappings')
          .insert({
            user_id: userId,
            email: userEmail,
            domain: domain.toLowerCase().trim(),
            git_branch: git_branch.trim(),
            environment
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating domain mapping:', error);
          if (error.code === '23505') {
            return json(res, 409, { error: 'Domain already exists for this user' });
          }
          return json(res, 500, { error: 'Failed to create domain mapping' });
        }

        return json(res, 201, { data });
      }

      case 'PUT': {
        // Update an existing domain mapping
        const body = await readJsonBody(req);
        const { id, git_branch, environment } = body;

        if (!id) {
          return json(res, 400, { error: 'ID is required' });
        }

        // Build update object
        const updates = {};
        if (git_branch !== undefined) {
          if (!validateBranchName(git_branch)) {
            return json(res, 400, { error: 'Invalid git branch name' });
          }
          updates.git_branch = git_branch.trim();
        }
        if (environment !== undefined) {
          if (!['production', 'preview'].includes(environment)) {
            return json(res, 400, { error: 'Environment must be either "production" or "preview"' });
          }
          updates.environment = environment;
        }

        if (Object.keys(updates).length === 0) {
          return json(res, 400, { error: 'No fields to update' });
        }

        // Update the mapping (RLS ensures user can only update their own)
        const { data, error } = await supabase
          .from('domain_git_mappings')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating domain mapping:', error);
          return json(res, 500, { error: 'Failed to update domain mapping' });
        }

        if (!data) {
          return json(res, 404, { error: 'Domain mapping not found' });
        }

        return json(res, 200, { data });
      }

      case 'DELETE': {
        // Delete a domain mapping
        const { id } = req.query;

        if (!id) {
          return json(res, 400, { error: 'ID is required' });
        }

        // Delete the mapping (RLS ensures user can only delete their own)
        const { error } = await supabase
          .from('domain_git_mappings')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) {
          console.error('Error deleting domain mapping:', error);
          return json(res, 500, { error: 'Failed to delete domain mapping' });
        }

        return json(res, 200, { message: 'Domain mapping deleted successfully' });
      }

      default:
        return json(res, 405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return json(res, 500, { error: error.message || 'Internal server error' });
  }
}
