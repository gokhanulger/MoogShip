import { Request, Response } from "express";
import { parse } from "csv-parse";
import { insertRecipientSchema } from "../../shared/schema";
import { storage } from "../storage";
import { z } from "zod";
import fs from 'fs';

// Create a schema for validating CSV import recipients
const csvRecipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

type CSVRecipient = z.infer<typeof csvRecipientSchema>;

export const importRecipients = async (req: Request, res: Response) => {
  try {
    // Check if file exists in the request
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Get the user ID from the authenticated session
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Process the uploaded CSV file
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Invalid file upload" });
    }
    
    // Use fs to read the file from disk (multer saves it to disk by default)
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    const results: CSVRecipient[] = [];
    const errors: string[] = [];
    
    // Define the parser
    const parser = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Parse the CSV data
    for await (const record of parser) {
      try {
        // Validate the record against our schema
        const validatedRecord = csvRecipientSchema.parse(record);
        results.push(validatedRecord);
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Format validation errors to be user-friendly
          const formattedErrors = error.errors.map(err => 
            `Row ${parser.info.lines}: Field "${err.path.join('.')}" - ${err.message}`
          );
          errors.push(...formattedErrors);
        } else {
          errors.push(`Row ${parser.info.lines}: Unknown error parsing record`);
        }
      }
    }

    // Import the validated recipients
    let successCount = 0;
    let failedCount = 0;
    
    for (const recipient of results) {
      try {
        // Check if recipient already exists
        const existingRecipients = await storage.getRecipientsByUserId(userId);
        const isDuplicate = existingRecipients.some(
          (existing) => {
            // Basic checks for name and address
            const nameMatch = existing.name === recipient.name;
            const addressMatch = existing.address === recipient.address;
            
            // Check for postalCode match only if both have values
            const postalCodeMatch = 
              (existing.postalCode && recipient.postalCode) 
                ? existing.postalCode === recipient.postalCode 
                : true; // If either is null/undefined, don't use postalCode for comparison
                
            return nameMatch && addressMatch && postalCodeMatch;
          }
        );
        
        if (isDuplicate) {
          errors.push(`Recipient ${recipient.name} at ${recipient.address} already exists`);
          failedCount++;
          continue;
        }
        
        // Format the recipient data for insertion
        const recipientData = {
          userId,
          name: recipient.name,
          address: recipient.address,
          city: recipient.city,
          state: recipient.state || null,
          country: recipient.country,
          postalCode: recipient.postalCode || null,
          phone: recipient.phone || null,
          email: recipient.email || null,
          isDefault: false,
        };
        
        // Validate against our insert schema
        const validatedData = insertRecipientSchema.parse(recipientData);
        
        // Insert into database
        await storage.createRecipient(validatedData);
        successCount++;
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Format validation errors to be user-friendly
          const formattedErrors = error.errors.map(err => 
            `Recipient ${recipient.name}: ${err.path.join('.')} - ${err.message}`
          );
          errors.push(...formattedErrors);
        } else {
          errors.push(`Failed to import recipient ${recipient.name}: ${(error as Error).message}`);
        }
        failedCount++;
      }
    }

    // Return the import results
    return res.status(200).json({
      message: "Import completed",
      total: results.length,
      success: successCount,
      failed: failedCount,
      errors: errors,
    });
  } catch (error) {
    console.error("Error importing recipients:", error);
    return res.status(500).json({ 
      message: "Server error while importing recipients",
      error: (error as Error).message
    });
  }
};