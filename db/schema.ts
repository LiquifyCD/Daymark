import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable(
  "habits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    owner: text("owner").notNull(),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    icon: text("icon").notNull().default("✦"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    archivedAt: text("archived_at"),
  },
  (table) => [index("habits_owner_idx").on(table.owner)],
);

export const checkins = sqliteTable(
  "checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    owner: text("owner").notNull(),
    checkedOn: text("checked_on").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("checkins_habit_day_unique").on(table.habitId, table.checkedOn),
    index("checkins_owner_day_idx").on(table.owner, table.checkedOn),
  ],
);
