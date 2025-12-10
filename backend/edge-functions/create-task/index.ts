// LearnLynk Tech Test - Task 3: Edge Function create-task

// Deno + Supabase Edge Functions style
// Docs reference: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type CreateTaskPayload = {
  application_id: string;
  task_type: string;
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"] as const;
type TYPE_OF_VALID_TYPES = (typeof VALID_TYPES)[number];

//helper function to validate due_at
function validFutureDate(due_at: string): boolean {
  const date = new Date(due_at);
  const now = new Date();
  return date.getTime() > now.getTime();
}

serve(async (req: Request): Promise<Response> => {
  try{
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: CreateTaskPayload
    try {
      body = await req.json();
    }catch(err){
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), 
      {status :400, headers: { "Content-Type": "application/json" },
      });
    }

    const { application_id, task_type, due_at } = body;

    if(!application_id || !task_type || !due_at){
      return new Response(JSON.stringify
        ({ error: "Missing required fields" }), 
      {status :400, headers: { "Content-Type": "application/json" },
      });
    }

    // validate task type
    const normalizedType = task_type.toLowerCase();
    if (!VALID_TYPES.includes(normalizedType as TYPE_OF_VALID_TYPES)) {
      return new Response(
        JSON.stringify(
          {error: `Invalid task_type. Must be one of ${VALID_TYPES.join(", ")}` }),
          {status: 400, headers: { "Content-Type": "application/json" },
      });
    }


    // valdiate due_at is a vlaid future timestamp
    if(!validFutureDate(due_at)){
      return new Response(
        JSON.stringify({ error: "due_at must be a valid future timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }



      // TODO: insert into tasks table using supabase client

      // Example:
      // const { data, error } = await supabase
      //   .from("tasks")
      //   .insert({ ... })
      //   .select()
      //   .single();

      //inseritn into tasks table
      //tenant id should come from the application row or auth/jwt
      const {data: appRow, error: appError} = await supabase
      .from ('applications')
      .select('tenant_id')
      .eq('id', application_id)
      .single();

      if(appError || !appRow){
        return new Response(
          JSON.stringify({ error: "Invalid application_idor application not found" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const {data, error} = await supabase
      .from('tasks')
      .insert({
        tenant_id: appRow.tenant_id,
        application_id: appRow.id,
        type: normalizedType,
        status: 'open',
        due_at,
      })
      .select("id")
      .single();

      return new Response(JSON.stringify({ success: true, task_id: data?.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });


      // TODO: handle error and return appropriate status code

      // Example successful response:
      // return new Response(JSON.stringify({ success: true, task_id: data.id }), {
      //   status: 200,
      //   headers: { "Content-Type": "application/json" },
      // });

  } catch (err) {
    console.error("Unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
