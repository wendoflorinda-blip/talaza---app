import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PAGE_SIZE = 200;
const BATCH_SIZE = 100;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const suppliedSecret = req.headers.get("x-talaza-cron-secret") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !suppliedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authorized, error: authError } = await admin.rpc(
    "talaza_validate_cleanup_token",
    { p_token: suppliedSecret }
  );
  if (authError || authorized !== true) return new Response("Unauthorized", { status: 401 });

  const now = new Date().toISOString();
  const totals = {
    businessUpdates: 0,
    communityPosts: 0,
    events: 0,
    premiumPromotions: 0,
    motivations: 0,
    monthlyThemes: 0,
    removedFiles: 0,
    preservedSharedFiles: 0
  };

  function storagePathFromUrl(value: string | null, bucket: string): string | null {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      const pattern = new RegExp("/storage/v1/object/(?:public|sign|authenticated)/" + bucket + "/(.+)$");
      const match = parsed.pathname.match(pattern);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }

  async function removePaths(bucket: string, paths: string[]) {
    const unique = [...new Set(paths.filter(Boolean))];
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const { error } = await admin.storage.from(bucket).remove(unique.slice(i, i + BATCH_SIZE));
      if (error) throw new Error("Storage " + bucket + ": " + error.message);
      totals.removedFiles += unique.slice(i, i + BATCH_SIZE).length;
    }
  }

  async function isReferencedOutside(
    table: string,
    column: string,
    value: string,
    batchIds: string[]
  ): Promise<boolean> {
    let query = admin.from(table).select("id").eq(column, value).limit(1);
    if (batchIds.length) query = query.not("id", "in", "(" + batchIds.join(",") + ")");
    const { data, error } = await query;
    if (error) throw error;
    return Boolean(data?.length);
  }

  async function removeCommunityMediaIfUnused(url: string, batchIds: string[]) {
    const path = storagePathFromUrl(url, "community-posts");
    if (!path) return;
    if (await isReferencedOutside("community_posts", "image_url", url, batchIds)) {
      totals.preservedSharedFiles += 1;
      return;
    }
    await removePaths("community-posts", [path]);
  }

  async function removeEventMediaIfUnused(url: string, column: "image_url" | "video_url", batchIds: string[]) {
    const path = storagePathFromUrl(url, "event-images");
    if (!path) return;
    const otherColumn = column === "image_url" ? "video_url" : "image_url";
    if (
      await isReferencedOutside("events", column, url, batchIds) ||
      await isReferencedOutside("events", otherColumn, url, batchIds)
    ) {
      totals.preservedSharedFiles += 1;
      return;
    }
    await removePaths("event-images", [path]);
  }

  async function removeOfficialBackgroundIfUnused(url: string, table: "community_motivation" | "community_monthly_themes", batchIds: string[]) {
    const path = storagePathFromUrl(url, "business-media");
    // Only this dedicated folder belongs to editorial community backgrounds.
    if (!path || !path.startsWith("community-backgrounds/")) return;
    const otherTable = table === "community_motivation" ? "community_monthly_themes" : "community_motivation";
    if (
      await isReferencedOutside(table, "background_image_url", url, batchIds) ||
      await isReferencedOutside(otherTable, "background_image_url", url, [])
    ) {
      totals.preservedSharedFiles += 1;
      return;
    }
    await removePaths("business-media", [path]);
  }

  try {
    // 1) Seller updates: these are the only seller-panel media that expire,
    // after seven days. The seller's permanent gallery is in another bucket.
    while (true) {
      const { data: rows, error } = await admin
        .from("business_updates")
        .select("id,media_path")
        .lte("expires_at", now)
        .order("expires_at", { ascending: true })
        .limit(PAGE_SIZE);
      if (error) throw error;
      if (!rows?.length) break;
      const ids = rows.map((row: { id: string }) => row.id);
      const paths = rows.map((row: { media_path: string }) => row.media_path).filter(Boolean);
      await removePaths("business-updates", paths);
      const { error: deleteError } = await admin.from("business_updates").delete().in("id", ids);
      if (deleteError) throw deleteError;
      totals.businessUpdates += ids.length;
      if (rows.length < PAGE_SIZE) break;
    }

    // 2) Community: questions, Achei and Procura-se all expire by expires_at.
    while (true) {
      const { data: rows, error } = await admin
        .from("community_posts")
        .select("id,image_url")
        .lte("expires_at", now)
        .order("expires_at", { ascending: true })
        .limit(PAGE_SIZE);
      if (error) throw error;
      if (!rows?.length) break;
      const ids = rows.map((row: { id: string }) => row.id);
      for (const row of rows) {
        if (row.image_url) await removeCommunityMediaIfUnused(row.image_url, ids);
      }
      const { error: deleteError } = await admin.from("community_posts").delete().in("id", ids);
      if (deleteError) throw deleteError;
      // FK cascades remove post comments, likes and favourites.
      totals.communityPosts += ids.length;
      if (rows.length < PAGE_SIZE) break;
    }

    // 3) Paid and approved event placements: keep pending payment drafts.
    while (true) {
      const { data: rows, error } = await admin
        .from("events")
        .select("id,image_url,video_url")
        .eq("status", "published")
        .eq("payment_status", "paid")
        .eq("admin_approved", true)
        .not("expires_at", "is", null)
        .lte("expires_at", now)
        .order("expires_at", { ascending: true })
        .limit(PAGE_SIZE);
      if (error) throw error;
      if (!rows?.length) break;
      const ids = rows.map((row: { id: string }) => row.id);
      for (const row of rows) {
        if (row.image_url) await removeEventMediaIfUnused(row.image_url, "image_url", ids);
        if (row.video_url) await removeEventMediaIfUnused(row.video_url, "video_url", ids);
      }
      const { error: deleteError } = await admin.from("events").delete().in("id", ids);
      if (deleteError) throw deleteError;
      // Event comments and likes use ON DELETE CASCADE.
      totals.events += ids.length;
      if (rows.length < PAGE_SIZE) break;
    }

    // 4) Expired paid premium promotions. Never remove gallery media:
    // only paths explicitly stored as businessId/premium-* are eligible.
    while (true) {
      const { data: rows, error } = await admin
        .from("premium_promotions")
        .select("id,business_id,storage_path,status")
        .not("expires_at", "is", null)
        .lte("expires_at", now)
        .neq("status", "pending_payment")
        .order("expires_at", { ascending: true })
        .limit(PAGE_SIZE);
      if (error) throw error;
      if (!rows?.length) break;
      const ids = rows.map((row: { id: string }) => row.id);
      for (const row of rows) {
        const expectedPrefix = row.business_id + "/premium-";
        if (row.storage_path?.startsWith(expectedPrefix)) {
          const { data: refs, error: refError } = await admin
            .from("premium_promotions")
            .select("id")
            .eq("storage_path", row.storage_path)
            .not("id", "in", "(" + ids.join(",") + ")")
            .limit(1);
          if (refError) throw refError;
          if (refs?.length) totals.preservedSharedFiles += 1;
          else await removePaths("business-media", [row.storage_path]);
        } else if (row.storage_path) {
          // Unexpected legacy path: retain the file rather than risk seller media.
          totals.preservedSharedFiles += 1;
        }
      }
      const { error: deleteError } = await admin.from("premium_promotions").delete().in("id", ids);
      if (deleteError) throw deleteError;
      totals.premiumPromotions += ids.length;
      if (rows.length < PAGE_SIZE) break;
    }

    // 5) Official Motivation and monthly themes expire and are deleted.
    // The weekly title is part of its monthly-theme row, so it expires with it.
    for (const table of ["community_motivation", "community_monthly_themes"] as const) {
      const dateColumn = table === "community_motivation" ? "expires_at" : "ends_at";
      while (true) {
        const { data: rows, error } = await admin
          .from(table)
          .select("id,background_image_url")
          .not(dateColumn, "is", null)
          .lte(dateColumn, now)
          .limit(PAGE_SIZE);
        if (error) throw error;
        if (!rows?.length) break;
        const ids = rows.map((row: { id: string }) => row.id);
        for (const row of rows) {
          if (row.background_image_url) {
            await removeOfficialBackgroundIfUnused(row.background_image_url, table, ids);
          }
        }
        for (const officialType of [table === "community_motivation" ? "motivation" : "theme"]) {
          const { error: likesError } = await admin.from("community_official_likes")
            .delete().eq("official_type", officialType).in("official_id", ids);
          if (likesError) throw likesError;
          const { error: commentsError } = await admin.from("community_official_comments")
            .delete().eq("official_type", officialType).in("official_id", ids);
          if (commentsError) throw commentsError;
        }
        const { error: deleteError } = await admin.from(table).delete().in("id", ids);
        if (deleteError) throw deleteError;
        if (table === "community_motivation") totals.motivations += ids.length;
        else totals.monthlyThemes += ids.length;
        if (rows.length < PAGE_SIZE) break;
      }
    }

    // Preserve existing hosting-expiry business rules.
    const { error: hostingError } = await admin.rpc("talaza_enforce_hosting_expiry");
    if (hostingError) throw hostingError;

    return Response.json({ ok: true, ...totals, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("Talaza scheduled cleanup failed:", error);
    return Response.json(
      { ok: false, ...totals, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});
