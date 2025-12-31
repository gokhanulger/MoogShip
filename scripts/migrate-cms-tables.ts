import { pool } from "../server/db";
import { contentPages, contentTranslations } from "../shared/cms-schema";

async function main() {
  console.log("Starting CMS tables migration...");

  try {
    // Create content_pages table if it doesn't exist
    const createContentPagesTable = `
      CREATE TABLE IF NOT EXISTS "content_pages" (
        "id" SERIAL PRIMARY KEY,
        "slug" TEXT NOT NULL UNIQUE,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL DEFAULT 'page',
        "status" TEXT NOT NULL DEFAULT 'published',
        "created_by_id" INTEGER REFERENCES "users"("id"),
        "updated_by_id" INTEGER REFERENCES "users"("id"),
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create content_translations table if it doesn't exist
    const createContentTranslationsTable = `
      CREATE TABLE IF NOT EXISTS "content_translations" (
        "id" SERIAL PRIMARY KEY,
        "page_id" INTEGER NOT NULL REFERENCES "content_pages"("id") ON DELETE CASCADE,
        "language_code" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "updated_by_id" INTEGER REFERENCES "users"("id"),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        UNIQUE("page_id", "language_code")
      );
    `;

    // Execute the statements
    console.log("Creating content_pages table...");
    await pool.query(createContentPagesTable);
    console.log("✅ content_pages table created or already exists");

    console.log("Creating content_translations table...");
    await pool.query(createContentTranslationsTable);
    console.log("✅ content_translations table created or already exists");

    // Create indexes
    console.log("Creating indexes...");
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_pages_slug ON content_pages(slug);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_translations_language ON content_translations(language_code);`);
    console.log("✅ Indexes created");

    // Add sample data
    console.log("Checking for existing content...");
    const checkResult = await pool.query(`SELECT COUNT(*) FROM content_pages;`);
    const existingCount = parseInt(checkResult.rows[0].count);

    if (existingCount === 0) {
      console.log("Adding sample content page...");
      // Insert sample page
      const aboutPageResult = await pool.query(`
        INSERT INTO content_pages (slug, title, description, type, status, created_at, updated_at)
        VALUES ('about-us', 'About Us', 'Information about our company', 'company', 'published', NOW(), NOW())
        RETURNING id;
      `);
      
      const pageId = aboutPageResult.rows[0].id;
      console.log(`✅ Sample page created with ID: ${pageId}`);
      
      // Add English translation
      console.log("Adding English translation...");
      const enContent = JSON.stringify({
        title: "About MoogShip",
        subtitle: "Your Global Shipping Partner",
        content: [
          "MoogShip is a leading global shipping and logistics provider, dedicated to making international shipping simple and affordable.",
          "Founded in 2024, we have quickly grown to become a trusted partner for businesses and individuals looking to ship packages worldwide."
        ]
      });
      
      await pool.query(`
        INSERT INTO content_translations (page_id, language_code, content, updated_at)
        VALUES ($1, 'en', $2, NOW());
      `, [pageId, enContent]);
      
      // Add Turkish translation
      console.log("Adding Turkish translation...");
      const trContent = JSON.stringify({
        title: "MoogShip Hakkında",
        subtitle: "Global Kargo Ortağınız",
        content: [
          "MoogShip, uluslararası gönderileri basit ve ekonomik hale getirmeye adanmış önde gelen bir global kargo ve lojistik sağlayıcısıdır.",
          "2024 yılında kurulan şirketimiz, dünya çapında paket göndermek isteyen işletmeler ve bireyler için güvenilir bir ortak haline gelmiştir."
        ]
      });
      
      await pool.query(`
        INSERT INTO content_translations (page_id, language_code, content, updated_at)
        VALUES ($1, 'tr', $2, NOW());
      `, [pageId, trContent]);
      
      console.log("✅ Sample translations created");
    } else {
      console.log(`Found ${existingCount} existing content pages, skipping sample data creation`);
    }
    
    console.log("✅ CMS tables migration completed successfully!");

  } catch (error) {
    console.error("❌ Error during CMS tables migration:", error);
    process.exit(1);
  }

  // Close the database pool before exiting
  await pool.end();
  console.log("Database connection closed");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  // Make sure to clean up even on error
  pool.end().then(() => {
    console.log("Database connection closed");
    process.exit(1);
  });
});