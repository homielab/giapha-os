import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "./supabase/api";

export async function validateApiKey(
  request: Request,
): Promise<{ valid: boolean; error?: string }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const key = authHeader.slice(7).trim();
  if (!key) {
    return { valid: false, error: "Missing API key" };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: settings } = await supabase
      .from("family_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["api_key_enabled", "api_key_value"]);

    const settingsMap = Object.fromEntries(
      (settings ?? []).map(
        (s: { setting_key: string; setting_value: string | null }) => [
          s.setting_key,
          s.setting_value,
        ],
      ),
    );

    if (settingsMap.api_key_enabled !== "true") {
      return { valid: false, error: "API access is disabled" };
    }

    const storedKey = settingsMap.api_key_value;
    if (!storedKey) {
      return { valid: false, error: "API key not configured" };
    }

    const keyBuffer = Buffer.from(key);
    const storedBuffer = Buffer.from(storedKey);

    // Lengths must match for timingSafeEqual; if not, keys are definitely different
    if (keyBuffer.byteLength !== storedBuffer.byteLength) {
      return { valid: false, error: "Invalid API key" };
    }

    const isValid = timingSafeEqual(keyBuffer, storedBuffer);
    if (!isValid) {
      return { valid: false, error: "Invalid API key" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Internal error during key validation" };
  }
}
