const { sqliteTable, text, integer } = require("drizzle-orm/sqlite-core");

const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  title: text("title"),
  content: text("content"),
  tags: text("tags"), // store JSON string: ["tag1","tag2"]
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
  embedding: text("embedding"), // store as JSON for now
});

module.exports = { notes };

