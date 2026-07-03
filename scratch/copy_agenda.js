import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read env variables from eventos-app/.env.local
const envPath = path.join(__dirname, '..', 'eventos-app', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env config!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching events...");
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, agenda');

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  console.log("All Events found:");
  events.forEach(e => {
    console.log(`- [${e.id}] ${e.title} (Agenda items: ${Array.isArray(e.agenda) ? e.agenda.length : 0})`);
  });

  const sourceEvent = events.find(e => e.title.includes("Chubut"));
  const targetEvent = events.find(e => e.title.includes("Delegacion Comodoro") || e.title.includes("Delegación Comodoro"));

  if (!sourceEvent) {
    console.error("Could not find source event containing 'Chubut'");
    return;
  }

  if (!targetEvent) {
    console.error("Could not find target event containing 'Delegación Comodoro' or 'Delegacion Comodoro'");
    return;
  }

  console.log(`\nSource Event: ${sourceEvent.title} (ID: ${sourceEvent.id})`);
  console.log(`Target Event: ${targetEvent.title} (ID: ${targetEvent.id})`);
  console.log(`Agenda to copy:\n`, JSON.stringify(sourceEvent.agenda, null, 2));

  console.log("\nUpdating target event agenda...");
  const { data: updatedData, error: updateError } = await supabase
    .from('events')
    .update({ agenda: sourceEvent.agenda })
    .eq('id', targetEvent.id)
    .select();

  if (updateError) {
    console.error("Error updating event agenda:", updateError);
  } else {
    console.log("Success! Updated event:", updatedData);
  }
}

run();
