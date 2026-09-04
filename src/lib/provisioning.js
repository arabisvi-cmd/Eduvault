import { supabase } from './supabase';

/**
 * Provisions a new institutional user (TEACHER or STUDENT) safely.
 * 
 * Security Architecture:
 * - Invoked exclusively by authenticated Administrators.
 * - Server-side boundary enforces caller authorization and derives institution_id.
 * - Never uses service-role credentials in the frontend.
 * - Primary path: Supabase Edge Function 'provision-institution-user'.
 * - Fallback path: Database RPC 'provision_institution_user' if Edge Function is pending deployment.
 * 
 * @param {Object} params
 * @param {string} params.email - User email address
 * @param {string} params.fullName - User full legal / academic name
 * @param {'TEACHER' | 'STUDENT'} params.role - Target institutional role
 * @returns {Promise<{ success: boolean, message: string, user?: Object, code?: string, error?: string }>}
 */
export async function provisionInstitutionUser({ email, fullName, role }) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanFullName = (fullName || '').trim();
  const targetRole = (role || '').trim().toUpperCase();

  // Client-side quick checks before network hop
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      code: 'INVALID_EMAIL',
      error: 'Please enter a valid institutional email address.'
    };
  }

  if (!cleanFullName || cleanFullName.length < 2) {
    return {
      success: false,
      code: 'INVALID_NAME',
      error: 'Please enter a full name (minimum 2 characters).'
    };
  }

  if (targetRole !== 'TEACHER' && targetRole !== 'STUDENT') {
    return {
      success: false,
      code: 'INVALID_ROLE',
      error: 'Allowed roles are strictly TEACHER or STUDENT.'
    };
  }

  // 1. Primary: Invoke Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('provision-institution-user', {
      body: {
        email: cleanEmail,
        full_name: cleanFullName,
        role: targetRole
      }
    });

    // If edge function returned successfully
    if (!error && data) {
      if (data.error) {
        return {
          success: false,
          code: data.code || 'EDGE_FUNCTION_ERROR',
          error: data.error
        };
      }
      return {
        success: true,
        message: data.message || `${targetRole === 'TEACHER' ? 'Teacher' : 'Student'} provisioned successfully.`,
        user: data.user,
        method: data.method
      };
    }

    // If error from edge function call
    if (error) {
      // Check if function was not found (404 / NOT_FOUND)
      const errorMsg = error.message || '';
      const isNotFound = error.status === 404 || 
                         errorMsg.includes('404') || 
                         errorMsg.includes('not found') || 
                         errorMsg.includes('Failed to send a request');

      if (!isNotFound) {
        // If it's a real edge function response error (e.g. 400, 403, 409 parsed)
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errJson = await error.context.json();
            if (errJson.error) {
              return {
                success: false,
                code: errJson.code || 'EDGE_FUNCTION_ERROR',
                error: errJson.error
              };
            }
          } catch {
            // ignore JSON parse error
          }
        }
        return {
          success: false,
          code: 'EDGE_FUNCTION_ERROR',
          error: errorMsg || 'Server error while provisioning user.'
        };
      }

      console.warn('Edge Function returned 404 or connection error, evaluating RPC fallback...');
    }
  } catch (fnErr) {
    console.warn('Edge Function invocation caught error, evaluating RPC fallback:', fnErr);
  }

  // 2. Fallback: Invoke Database RPC 'provision_institution_user'
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('provision_institution_user', {
      p_email: cleanEmail,
      p_full_name: cleanFullName,
      p_role: targetRole
    });

    if (rpcErr) {
      // Handle known PostgreSQL custom errors
      const rpcMsg = rpcErr.message || '';
      if (rpcErr.code === '40300' || rpcMsg.includes('Forbidden')) {
        return {
          success: false,
          code: 'FORBIDDEN',
          error: 'Only institutional Administrators can provision users.'
        };
      }
      if (rpcErr.code === '40100' || rpcMsg.includes('Unauthorized')) {
        return {
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Your session has expired. Please log in again.'
        };
      }
      return {
        success: false,
        code: 'RPC_ERROR',
        error: rpcMsg || 'Database provisioning error.'
      };
    }

    if (rpcData) {
      if (rpcData.success === false) {
        return {
          success: false,
          code: rpcData.code || 'PROVISION_FAILED',
          error: rpcData.error || 'User provisioning failed.'
        };
      }
      return {
        success: true,
        message: rpcData.message || `${targetRole === 'TEACHER' ? 'Teacher' : 'Student'} provisioned successfully.`,
        user: rpcData.user,
        method: rpcData.method
      };
    }

    return {
      success: false,
      code: 'UNKNOWN_RESPONSE',
      error: 'Received empty response from provisioning service.'
    };
  } catch (rpcCatchErr) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: rpcCatchErr.message || 'Network error while contacting provisioning service.'
    };
  }
}
