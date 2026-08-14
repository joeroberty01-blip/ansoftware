import { query, queryOne } from "../db";
import type { MarketingPostRow } from "../types";

export async function createPost(input: {
  title: string;
  content: string;
  platform: string;
  aiGenerated: boolean;
  createdById: string;
}): Promise<MarketingPostRow> {
  const row = await queryOne<MarketingPostRow>(
    `INSERT INTO marketing_posts (title, content, platform, ai_generated, created_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.title, input.content, input.platform, input.aiGenerated, input.createdById]
  );
  if (!row) throw new Error("Imeshindwa kuongeza post");
  return row;
}

export async function listPosts(): Promise<MarketingPostRow[]> {
  return query<MarketingPostRow>(
    `SELECT * FROM marketing_posts ORDER BY created_at DESC`
  );
}

export async function getPostById(id: string): Promise<MarketingPostRow | null> {
  return queryOne<MarketingPostRow>(`SELECT * FROM marketing_posts WHERE id = $1`, [id]);
}

export async function updatePost(
  id: string,
  patch: { title?: string; content?: string; platform?: string }
): Promise<MarketingPostRow | null> {
  const columnMap: Record<string, unknown> = {
    title: patch.title,
    content: patch.content,
    platform: patch.platform,
  };

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return getPostById(id);
  }

  params.push(id);
  return queryOne<MarketingPostRow>(
    `UPDATE marketing_posts SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

export async function deletePost(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM marketing_posts WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

const SOCIAL_LINK_KEYS = [
  "social_facebook_url",
  "social_instagram_url",
  "social_whatsapp_url",
  "social_website_url",
] as const;

export async function getSocialLinks(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string | null }>(
    `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
    [SOCIAL_LINK_KEYS]
  );
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value ?? "";
  }
  return result;
}

export async function setSocialLinks(links: Record<string, string>): Promise<void> {
  for (const key of SOCIAL_LINK_KEYS) {
    if (links[key] === undefined) continue;
    await query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [key, links[key] || null]
    );
  }
}
