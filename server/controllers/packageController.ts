import { Request, Response } from 'express';
import { storage } from '../storage';
import { Package, InsertPackage } from '@shared/schema';

export const packageController = {
  /**
   * Get all packages for a shipment
   */
  async getPackagesForShipment(req: Request, res: Response) {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      if (isNaN(shipmentId)) {
        return res.status(400).json({ message: 'Invalid shipment ID' });
      }

      const packages = await storage.getShipmentPackages(shipmentId);
      return res.json(packages);
    } catch (error) {
      console.error('Error getting packages for shipment:', error);
      return res.status(500).json({ message: 'Failed to retrieve packages' });
    }
  },

  /**
   * Create one or more packages for a shipment
   */
  async createPackages(req: Request, res: Response) {
    try {
      const shipmentId = parseInt(req.params.shipmentId);
      if (isNaN(shipmentId)) {
        return res.status(400).json({ message: 'Invalid shipment ID' });
      }

      // Check if shipment exists and user has access
      const shipment = await storage.getShipment(shipmentId);
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }

      // Validate that user owns the shipment or is admin
      if (shipment.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const packagesData = Array.isArray(req.body) ? req.body : [req.body];
      
      // Process each package and convert dimensions to strings
      const processedPackages: InsertPackage[] = packagesData.map((pkg: any) => ({
        shipmentId,
        name: pkg.name || 'Package',
        description: pkg.description || null,
        notes: pkg.notes || null,
        weight: String(pkg.weight || 0),
        length: String(pkg.length || 0),
        width: String(pkg.width || 0),
        height: String(pkg.height || 0)
      }));

      const createdPackages = await storage.createManyPackages(processedPackages);
      return res.status(201).json(createdPackages);
    } catch (error) {
      console.error('Error creating packages:', error);
      return res.status(500).json({ message: 'Failed to create packages' });
    }
  },

  /**
   * Update a package
   */
  async updatePackage(req: Request, res: Response) {
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) {
        return res.status(400).json({ message: 'Invalid package ID' });
      }

      // Get the package to verify ownership
      const packageData = await storage.getPackage(packageId);
      if (!packageData) {
        return res.status(404).json({ message: 'Package not found' });
      }

      // Check if user owns the shipment this package belongs to
      const shipment = await storage.getShipment(packageData.shipmentId);
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }

      if (shipment.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Process the update data - make sure all values are properly formatted
      console.log("Updating package with data:", req.body);
      
      const updateData: Partial<Package> = {
        name: req.body.name,
        description: req.body.description,
        notes: req.body.notes,  // Added notes field
        // Convert numbers to strings with fixed precision for database storage
        weight: req.body.weight !== undefined ? String(parseFloat(req.body.weight).toFixed(2)) : packageData.weight,
        length: req.body.length !== undefined ? String(parseFloat(req.body.length).toFixed(2)) : packageData.length,
        width: req.body.width !== undefined ? String(parseFloat(req.body.width).toFixed(2)) : packageData.width,
        height: req.body.height !== undefined ? String(parseFloat(req.body.height).toFixed(2)) : packageData.height
      };
      
      console.log("Formatted update data:", updateData);

      const updatedPackage = await storage.updatePackage(packageId, updateData);
      return res.json(updatedPackage);
    } catch (error) {
      console.error('Error updating package:', error);
      return res.status(500).json({ message: 'Failed to update package' });
    }
  },

  /**
   * Delete a package
   */
  async deletePackage(req: Request, res: Response) {
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) {
        return res.status(400).json({ message: 'Invalid package ID' });
      }

      // Get the package to verify ownership
      const packageData = await storage.getPackage(packageId);
      if (!packageData) {
        return res.status(404).json({ message: 'Package not found' });
      }

      // Check if user owns the shipment this package belongs to
      const shipment = await storage.getShipment(packageData.shipmentId);
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }

      if (shipment.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      await storage.deletePackage(packageId);
      return res.status(200).json({ message: 'Package deleted successfully' });
    } catch (error) {
      console.error('Error deleting package:', error);
      return res.status(500).json({ message: 'Failed to delete package' });
    }
  }
};