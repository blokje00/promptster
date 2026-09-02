import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import * as aiSettings from "@/api/aiSettings";
import { configureNous, resetNous } from "@/lib/nousClient";

/**
 * Renders nothing. Keeps src/lib/nousClient.js configured with the
 * signed-in user's Nous Research key/model overrides, read from their
 * AISettings row (see base44/entities/AISettings.jsonc: nous_api_key,
 * nous_text_model, nous_vision_model). The key never enters the bundle —
 * it's fetched per-session like any other user-scoped entity field.
 *
 * Mounted once in src/Layout.jsx, next to PageViewTracker.
 */
export default function NousKeyLoader() {
  const { currentUser } = useAuth();
  const { data: settings } = aiSettings.useList({ enabled: !!currentUser?.email });

  const row = settings?.[0];
  const apiKey = row?.nous_api_key;
  const textModel = row?.nous_text_model;
  const visionModel = row?.nous_vision_model;

  useEffect(() => {
    if (!currentUser?.email) {
      resetNous();
      return;
    }
    if (!row) return;
    configureNous({ apiKey, textModel, visionModel });
  }, [currentUser?.email, row, apiKey, textModel, visionModel]);

  return null;
}
