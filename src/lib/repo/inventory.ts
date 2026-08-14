import { query, queryOne, withTransaction } from "../db";
import { logAudit } from "../audit";
import type { InventoryItemRow, StockMovementRow, StockMovementType } from "../types";

export interface InventoryItemWithStock extends InventoryItemRow {
  current_stock: string;
  is_low_stock: boolean;
}

const STOCK_SELECT = `
  i.*,
  COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END), 0) AS current_stock,
  COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END), 0) <= i.reorder_level AS is_low_stock
`;

export async function createItem(input: {
  name: string;
  category: string;
  unit: string;
  reorderLevel: number;
}): Promise<InventoryItemRow> {
  const row = await queryOne<InventoryItemRow>(
    `INSERT INTO inventory_items (name, category, unit, reorder_level)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.name, input.category, input.unit, input.reorderLevel]
  );
  if (!row) throw new Error("Imeshindwa kuongeza item");
  return row;
}

export async function updateItem(
  id: string,
  patch: {
    name?: string;
    category?: string;
    unit?: string;
    reorderLevel?: number;
  }
): Promise<InventoryItemRow | null> {
  const columnMap: Record<string, unknown> = {
    name: patch.name,
    category: patch.category,
    unit: patch.unit,
    reorder_level: patch.reorderLevel,
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
    return queryOne<InventoryItemRow>(
      `SELECT * FROM inventory_items WHERE id = $1`,
      [id]
    );
  }

  params.push(id);
  return queryOne<InventoryItemRow>(
    `UPDATE inventory_items SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

/**
 * Deletes an item only if it has zero recorded stock movements — otherwise
 * the item's movement history (the inventory audit trail) would be lost.
 * Blocked, not silently cascaded, same policy as invoice cancellation.
 */
export async function deleteItem(id: string): Promise<void> {
  const item = await queryOne(`SELECT id FROM inventory_items WHERE id = $1`, [id]);
  if (!item) throw new Error("NOT_FOUND");

  const movementCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM stock_movements WHERE item_id = $1`,
    [id]
  );
  if (Number(movementCount?.count ?? "0") > 0) {
    throw new Error("HAS_MOVEMENTS");
  }

  await query(`DELETE FROM inventory_items WHERE id = $1`, [id]);
}

export async function listItemsWithStock(): Promise<InventoryItemWithStock[]> {
  return query<InventoryItemWithStock>(
    `SELECT ${STOCK_SELECT}
     FROM inventory_items i
     LEFT JOIN stock_movements m ON m.item_id = i.id
     GROUP BY i.id
     ORDER BY i.name ASC`
  );
}

export async function getItemById(
  id: string
): Promise<InventoryItemWithStock | null> {
  return queryOne<InventoryItemWithStock>(
    `SELECT ${STOCK_SELECT}
     FROM inventory_items i
     LEFT JOIN stock_movements m ON m.item_id = i.id
     WHERE i.id = $1
     GROUP BY i.id`,
    [id]
  );
}

export async function listMovements(
  itemId: string
): Promise<StockMovementRow[]> {
  return query<StockMovementRow>(
    `SELECT * FROM stock_movements WHERE item_id = $1 ORDER BY created_at DESC`,
    [itemId]
  );
}

/**
 * Locks the item row for the duration of the transaction so two concurrent
 * OUT movements against the same item can't both pass the stock check
 * against a stale current_stock read.
 */
export async function recordStockMovement(input: {
  itemId: string;
  movementType: StockMovementType;
  quantity: number;
  batchNumber: string | null;
  expiryDate: string | null;
  reference: string | null;
  notes: string | null;
  createdById: string;
}): Promise<StockMovementRow> {
  return withTransaction(async (client) => {
    const itemRes = await client.query(
      `SELECT id FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [input.itemId]
    );
    if (itemRes.rows.length === 0) throw new Error("NOT_FOUND");

    if (input.movementType === "OUT") {
      const stockRes = await client.query<{ current_stock: string }>(
        `SELECT COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
         FROM stock_movements WHERE item_id = $1`,
        [input.itemId]
      );
      const currentStock = parseInt(stockRes.rows[0]?.current_stock ?? "0", 10);
      if (input.quantity > currentStock) {
        throw new Error("INSUFFICIENT_STOCK");
      }
    }

    const movRes = await client.query<StockMovementRow>(
      `INSERT INTO stock_movements
         (item_id, movement_type, quantity, batch_number, expiry_date, reference, notes, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.itemId,
        input.movementType,
        input.quantity,
        input.batchNumber,
        input.expiryDate,
        input.reference,
        input.notes,
        input.createdById,
      ]
    );

    await logAudit(
      {
        userId: input.createdById,
        action: input.movementType === "IN" ? "STOCK_IN" : "STOCK_OUT",
        entity: "inventory_item",
        entityId: input.itemId,
        meta: { quantity: input.quantity, batchNumber: input.batchNumber },
      },
      client
    );

    return movRes.rows[0];
  });
}

export async function listLowStockItems(): Promise<InventoryItemWithStock[]> {
  const items = await listItemsWithStock();
  return items.filter((i) => i.is_low_stock);
}

export interface ExpiringBatch extends StockMovementRow {
  item_name: string;
}

export async function listExpiringBatches(
  withinDays: number
): Promise<ExpiringBatch[]> {
  return query<ExpiringBatch>(
    `SELECT m.*, i.name AS item_name
     FROM stock_movements m
     JOIN inventory_items i ON i.id = m.item_id
     WHERE m.movement_type = 'IN'
       AND m.expiry_date IS NOT NULL
       AND m.expiry_date <= (CURRENT_DATE + $1::int)
     ORDER BY m.expiry_date ASC`,
    [withinDays]
  );
}
