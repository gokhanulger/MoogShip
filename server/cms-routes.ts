import { Router } from "express";
import { z } from "zod";
import { authenticateToken, isAdmin } from "./middlewares/auth";
import type { IStorage } from "./storage";

/**
 * Register CMS routes
 * 
 * This function sets up both admin and public routes for the CMS functionality
 */
export function registerCmsRoutes(app: any) {
  const storage: IStorage = app.locals.storage;
  
  // Admin-only CMS routes (protected)
  const adminCmsRouter = Router();
  
  // Middleware to ensure only admins can access these routes
  adminCmsRouter.use(authenticateToken, isAdmin);
  
  // Get all content pages
  adminCmsRouter.get("/pages", async (req, res) => {
    try {
      const pages = await storage.getContentPages();
      res.json(pages);
    } catch (error) {
      console.error("Error fetching content pages:", error);
      res.status(500).json({ message: "Failed to fetch content pages" });
    }
  });
  
  // Get a single content page by ID
  adminCmsRouter.get("/pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      const page = await storage.getContentPageById(id);
      
      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      res.json(page);
    } catch (error) {
      console.error(`Error fetching content page ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch content page" });
    }
  });
  
  // Create a new content page
  adminCmsRouter.post("/pages", async (req, res) => {
    try {
      // Basic validation
      const pageSchema = z.object({
        slug: z.string().min(1, "Slug is required"),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional().nullable(),
        type: z.string().min(1, "Type is required"),
      });
      
      const result = pageSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: result.error.errors
        });
      }
      
      // Check if page with this slug already exists
      const existingPage = await storage.getContentPageBySlug(result.data.slug);
      
      if (existingPage) {
        return res.status(409).json({ message: "A page with this slug already exists" });
      }
      
      // Save the new page
      const page = await storage.createContentPage({
        ...result.data,
        createdById: req.user?.id,
        updatedById: req.user?.id,
      });
      
      res.status(201).json(page);
    } catch (error) {
      console.error("Error creating content page:", error);
      res.status(500).json({ message: "Failed to create content page" });
    }
  });
  
  // Update a content page
  adminCmsRouter.patch("/pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      // Basic validation
      const pageSchema = z.object({
        slug: z.string().min(1, "Slug is required").optional(),
        title: z.string().min(1, "Title is required").optional(),
        description: z.string().optional().nullable(),
        type: z.string().optional(),
      });
      
      const result = pageSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: result.error.errors
        });
      }
      
      // Check if the page exists
      const existingPage = await storage.getContentPageById(id);
      
      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // If slug is being changed, check if new slug is already in use
      if (result.data.slug && result.data.slug !== existingPage.slug) {
        const pageWithSlug = await storage.getContentPageBySlug(result.data.slug);
        
        if (pageWithSlug && pageWithSlug.id !== id) {
          return res.status(409).json({ message: "A page with this slug already exists" });
        }
      }
      
      // Update the page
      const updatedPage = await storage.updateContentPage(id, {
        ...result.data,
        updatedById: req.user?.id,
      });
      
      res.json(updatedPage);
    } catch (error) {
      console.error(`Error updating content page ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update content page" });
    }
  });
  
  // Delete a content page
  adminCmsRouter.delete("/pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      // Check if the page exists
      const existingPage = await storage.getContentPageById(id);
      
      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // Delete the page
      const success = await storage.deleteContentPage(id);
      
      if (success) {
        res.status(200).json({ message: "Content page deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete content page" });
      }
    } catch (error) {
      console.error(`Error deleting content page ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete content page" });
    }
  });
  
  // Get all translations for a content page
  adminCmsRouter.get("/pages/:id/translations", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      // Check if the page exists
      const existingPage = await storage.getContentPageById(id);
      
      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // Get translations
      const translations = await storage.getContentTranslations(id);
      
      res.json(translations);
    } catch (error) {
      console.error(`Error fetching translations for page ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });
  
  // Get a specific translation for a content page
  adminCmsRouter.get("/pages/:id/translations/:lang", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      const languageCode = req.params.lang;
      
      // Check if the page exists
      const existingPage = await storage.getContentPageById(id);
      
      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // Get the translation
      const translation = await storage.getContentTranslation(id, languageCode);
      
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      
      res.json(translation);
    } catch (error) {
      console.error(`Error fetching translation for page ${req.params.id} (${req.params.lang}):`, error);
      res.status(500).json({ message: "Failed to fetch translation" });
    }
  });
  
  // Create or update a translation for a content page
  adminCmsRouter.post("/pages/:id/translations/:lang", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      const languageCode = req.params.lang;
      
      // Basic validation
      const translationSchema = z.object({
        content: z.string().min(1, "Content is required"),
      });
      
      const result = translationSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: result.error.errors
        });
      }
      
      // Check if the page exists
      const existingPage = await storage.getContentPageById(id);
      
      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // Create or update the translation
      const translation = await storage.createOrUpdateContentTranslation({
        pageId: id,
        languageCode,
        content: result.data.content,
        updatedById: req.user?.id,
      });
      
      res.json(translation);
    } catch (error) {
      console.error(`Error saving translation for page ${req.params.id} (${req.params.lang}):`, error);
      res.status(500).json({ message: "Failed to save translation" });
    }
  });
  
  // Delete a translation for a content page
  adminCmsRouter.delete("/pages/:id/translations/:lang", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid page ID" });
      }
      
      const languageCode = req.params.lang;
      
      // Check if the page exists
      const existingPage = await storage.getContentPageById(id);
      
      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // Check if the translation exists
      const existingTranslation = await storage.getContentTranslation(id, languageCode);
      
      if (!existingTranslation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      
      // Delete the translation
      const success = await storage.deleteContentTranslation(id, languageCode);
      
      if (success) {
        res.status(200).json({ message: "Translation deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete translation" });
      }
    } catch (error) {
      console.error(`Error deleting translation for page ${req.params.id} (${req.params.lang}):`, error);
      res.status(500).json({ message: "Failed to delete translation" });
    }
  });
  
  // Public CMS routes (no authentication required)
  const publicCmsRouter = Router();
  
  // Get a content page by slug with translations
  publicCmsRouter.get("/pages/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      
      // Get the page
      const page = await storage.getContentPageBySlug(slug);
      
      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }
      
      // Get all translations for the page
      const translations = await storage.getContentTranslations(page.id);
      
      // Combine the page data with its translations
      const result = {
        ...page,
        translations: translations.reduce((acc, translation) => {
          acc[translation.languageCode] = translation.content;
          return acc;
        }, {} as Record<string, string>)
      };
      
      res.json(result);
    } catch (error) {
      console.error(`Error fetching content page by slug ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch content page" });
    }
  });
  
  // Get pages by type
  publicCmsRouter.get("/pages/type/:type", async (req, res) => {
    try {
      const type = req.params.type;
      
      // Get pages of the specified type
      const pages = await storage.getContentPagesByType(type);
      
      res.json(pages);
    } catch (error) {
      console.error(`Error fetching content pages by type ${req.params.type}:`, error);
      res.status(500).json({ message: "Failed to fetch content pages" });
    }
  });
  
  // Register the routers with the app
  app.use('/api/cms', adminCmsRouter);
  app.use('/api/public/cms', publicCmsRouter);
}