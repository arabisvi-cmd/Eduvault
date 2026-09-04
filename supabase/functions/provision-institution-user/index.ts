import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProvisionRequest {
  email?: string;
  full_name?: string;
  role?: string;
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is supported." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 2. Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "").trim();

    // 3. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing server configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
      return new Response(
        JSON.stringify({ error: "Internal server configuration error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Verify Caller JWT
    const { data: { user: callerAuthUser }, error: callerAuthError } = await adminClient.auth.getUser(token);
    if (callerAuthError || !callerAuthUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verify Caller is ADMIN and resolve caller's institution
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("users")
      .select("id, role, institution_id, full_name")
      .eq("id", callerAuthUser.id)
      .single();

    if (callerProfileError || !callerProfile || callerProfile.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only institutional Administrators can provision users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const institutionId = callerProfile.institution_id;
    if (!institutionId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Administrator does not belong to a valid institution." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Parse and validate request body
    let body: ProvisionRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawEmail = body.email?.trim() || "";
    const rawFullName = body.full_name?.trim() || "";
    const rawRole = body.role?.trim() || "";

    // Validation: Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validation: Full Name
    if (!rawFullName || rawFullName.length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a full name (minimum 2 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validation: Role integrity (Strictly TEACHER or STUDENT)
    if (rawRole !== "TEACHER" && rawRole !== "STUDENT") {
      return new Response(
        JSON.stringify({ error: "Role must be either 'TEACHER' or 'STUDENT'. Creating administrators or arbitrary roles is not permitted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEmail = rawEmail.toLowerCase();
    const cleanFullName = rawFullName;
    const targetRole = rawRole;

    // 7. Check if user already exists in public.users
    const { data: existingPublicUser, error: checkPublicErr } = await adminClient
      .from("users")
      .select("id, email, institution_id, role, full_name")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (checkPublicErr) {
      console.error("Error checking public.users:", checkPublicErr);
      return new Response(
        JSON.stringify({ error: "Database error during user check." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingPublicUser) {
      if (existingPublicUser.institution_id === institutionId) {
        return new Response(
          JSON.stringify({
            error: "This user already belongs to your institution.",
            code: "DUPLICATE_SAME_INSTITUTION",
            user: {
              id: existingPublicUser.id,
              email: existingPublicUser.email,
              role: existingPublicUser.role,
              full_name: existingPublicUser.full_name
            }
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            error: "A user with this email belongs to another institution. Cross-institutional transfer requires explicit administrative authorization.",
            code: "CONFLICT_OTHER_INSTITUTION"
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Check if an Auth user already exists in Supabase Auth (Orphan detection)
    let authUserId: string | null = null;
    let provisionMethod: "invited" | "reconciled" | "created" = "invited";

    // Scan existing Auth users for this email
    const { data: authListData, error: authListErr } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (!authListErr && authListData?.users) {
      const matchedAuthUser = authListData.users.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (matchedAuthUser) {
        authUserId = matchedAuthUser.id;
        provisionMethod = "reconciled";
        console.log(`Found orphaned auth user for ${cleanEmail}, reconciling UUID: ${authUserId}`);
      }
    }

    // 9. If no existing Auth user, create / invite via Supabase Auth Admin API
    if (!authUserId) {
      // First attempt: inviteUserByEmail
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: {
            full_name: cleanFullName,
            role: targetRole,
            institution_id: institutionId,
          },
        }
      );

      if (!inviteErr && inviteData?.user) {
        authUserId = inviteData.user.id;
        provisionMethod = "invited";
      } else {
        console.warn("inviteUserByEmail failed or email sending disabled, attempting admin createUser fallback:", inviteErr?.message);
        
        // Fallback: createUser with email_confirm = true
        // If invite email sending fails (e.g. SMTP not configured on project), create user cleanly
        const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            full_name: cleanFullName,
            role: targetRole,
            institution_id: institutionId,
          },
        });

        if (createErr || !createData?.user) {
          // If createUser failed because user already exists in Auth
          if (createErr?.message?.toLowerCase().includes("already registered") || createErr?.message?.toLowerCase().includes("already exists")) {
            // Re-fetch users to get the UUID
            const { data: retryList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const retryUser = retryList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
            if (retryUser) {
              authUserId = retryUser.id;
              provisionMethod = "reconciled";
            } else {
              return new Response(
                JSON.stringify({ error: `User exists in authentication but could not resolve account: ${createErr.message}` }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else {
            return new Response(
              JSON.stringify({ error: `Failed to create authentication user: ${createErr?.message || inviteErr?.message}` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          authUserId = createData.user.id;
          provisionMethod = "created";
        }
      }
    }

    if (!authUserId) {
      return new Response(
        JSON.stringify({ error: "Could not establish Supabase Auth identity." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Create corresponding row in public.users
    const { data: newProfile, error: insertProfileErr } = await adminClient
      .from("users")
      .insert({
        id: authUserId,
        institution_id: institutionId,
        email: cleanEmail,
        full_name: cleanFullName,
        role: targetRole,
      })
      .select()
      .single();

    if (insertProfileErr) {
      console.error("Failed to create public.users profile:", insertProfileErr);
      return new Response(
        JSON.stringify({ error: `Failed to create institutional profile: ${insertProfileErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Record immutable audit log
    try {
      await adminClient.from("audit_logs").insert({
        institution_id: institutionId,
        user_id: callerProfile.id,
        action: "USER_PROVISIONED",
        entity_table: "users",
        entity_id: authUserId,
        metadata: {
          role: targetRole,
          email: cleanEmail,
          full_name: cleanFullName,
          method: provisionMethod,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn("Audit log non-fatal warning:", auditErr);
    }

    // 12. Return safe result
    let userFacingMessage = "";
    if (provisionMethod === "invited") {
      userFacingMessage = `Invitation sent to ${cleanEmail}.`;
    } else if (provisionMethod === "reconciled") {
      userFacingMessage = `Existing account reconciled and enrolled as ${targetRole}.`;
    } else {
      userFacingMessage = `${targetRole === "TEACHER" ? "Teacher" : "Student"} account provisioned successfully.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: userFacingMessage,
        method: provisionMethod,
        user: {
          id: newProfile.id,
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: newProfile.role,
          institution_id: newProfile.institution_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unhandled error in provision-institution-user:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
