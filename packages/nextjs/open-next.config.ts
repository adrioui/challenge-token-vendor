import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const hasR2Binding = Boolean(process.env.NEXT_INC_CACHE_R2_BUCKET);

export default defineCloudflareConfig(
  hasR2Binding
    ? {
        incrementalCache: r2IncrementalCache,
      }
    : {},
);
