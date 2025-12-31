/**
 * This script creates tables for the CMS functionality
 * - content_pages: Stores information about content pages 
 * - content_translations: Stores multilingual content for each page
 */

import { storage } from "../server/storage";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { contentPages, contentTranslations } from "../shared/cms-schema";

async function createCmsTables() {
  try {
    console.log("Creating CMS tables...");
    
    // Check if content_pages table exists
    const pageTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_pages'
      );
    `);
    
    if (!pageTableExists.rows[0].exists) {
      // Create content_pages table
      await db.execute(sql`
        CREATE TABLE content_pages (
          id SERIAL PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL DEFAULT 'page',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("Created content_pages table");
    } else {
      console.log("content_pages table already exists");
    }
    
    // Check if content_translations table exists
    const translationTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_translations'
      );
    `);
    
    if (!translationTableExists.rows[0].exists) {
      // Create content_translations table
      await db.execute(sql`
        CREATE TABLE content_translations (
          page_id INTEGER NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
          language_code TEXT NOT NULL,
          content TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by_id INTEGER,
          PRIMARY KEY (page_id, language_code)
        );
      `);
      console.log("Created content_translations table");
    } else {
      console.log("content_translations table already exists");
    }
    
    // Seed initial data for existing pages
    const initialPages = [
      { slug: "about", title: "About Us", type: "company" },
      { slug: "terms", title: "Terms and Conditions", type: "legal" },
      { slug: "privacy", title: "Privacy Policy", type: "legal" },
      { slug: "cookies", title: "Cookie Policy", type: "legal" },
      { slug: "contact", title: "Contact Us", type: "company" },
      { slug: "careers", title: "Careers", type: "company" },
      { slug: "press", title: "Press", type: "company" },
      { slug: "news", title: "News", type: "company" },
      { slug: "global-shipping", title: "Global Shipping", type: "services" },
      { slug: "customs", title: "Customs Clearance", type: "services" },
      { slug: "freight", title: "Freight Forwarding", type: "services" },
      { slug: "warehousing", title: "Warehousing", type: "services" },
      { slug: "supply-chain", title: "Supply Chain", type: "services" },
      { slug: "gdpr", title: "GDPR Compliance", type: "legal" },
      { slug: "shipping-regulations", title: "Shipping Regulations", type: "legal" },
    ];
    
    console.log("Seeding initial pages...");
    
    for (const page of initialPages) {
      // Check if page already exists
      const existingPage = await db.select().from(contentPages).where(sql`${contentPages.slug} = ${page.slug}`);
      
      if (existingPage.length === 0) {
        // Insert page
        await db.insert(contentPages).values({
          slug: page.slug,
          title: page.title,
          type: page.type,
          description: `${page.title} page content`
        });
        
        console.log(`Added page: ${page.title}`);
      } else {
        console.log(`Page already exists: ${page.title}`);
      }
    }
    
    console.log("CMS tables setup complete!");
  } catch (error) {
    console.error("Error creating CMS tables:", error);
    throw error;
  }
}

async function main() {
  try {
    await createCmsTables();
    process.exit(0);
  } catch (error) {
    console.error("Failed to create CMS tables:", error);
    process.exit(1);
  }
}

main();