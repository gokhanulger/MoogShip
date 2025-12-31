import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertReturnSchema, insertReturnPhotoSchema } from '@shared/schema';
import { returnNotificationService } from '../services/returnNotificationService';
import { sendStatusUpdateEmail, sendPhotoUploadEmail } from '../services/returnEmailService';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Configure multer for photo uploads
const storage_config = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'returns');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `return-${timestamp}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

export const upload = multer({ 
  storage: storage_config,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create a new return
export const createReturn = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Parse the return data
    const returnData = insertReturnSchema.parse({
      ...req.body,
      sellerId: user.id
    });

    const newReturn = await storage.createReturn(returnData);
    
    // Send email notification to seller
    await returnNotificationService.sendNewReturnNotification(newReturn);
    
    res.status(201).json({
      success: true,
      data: newReturn
    });
  } catch (error: any) {
    console.error('Error creating return:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create return'
    });
  }
};

// Get returns for a seller
export const getReturns = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const sellerId = user.role === 'admin' ? 
      (req.query.sellerId ? parseInt(req.query.sellerId as string) : undefined) : 
      user.id;

    const returns = await storage.getReturns(sellerId);
    
    res.json({
      success: true,
      data: returns
    });
  } catch (error: any) {
    console.error('Error getting returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get returns'
    });
  }
};

// Get all returns for admin
export const getAdminReturns = async (req: Request, res: Response) => {
  try {
    const returns = await storage.getReturns(); // Get all returns without sellerId filter
    
    res.json({
      success: true,
      data: returns
    });
  } catch (error: any) {
    console.error('Error getting admin returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get returns'
    });
  }
};

// Get a specific return with photos
export const getReturn = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    const user = req.user as any;
    
    // Validate that returnId is a valid number
    if (isNaN(returnId) || returnId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid return ID'
      });
    }
    
    const returnData = await storage.getReturn(returnId);
    
    if (!returnData) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }

    // Check if user has access to this return
    if (user.role !== 'admin' && returnData.sellerId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get photos for this return
    const photos = await storage.getReturnPhotos(returnId);
    
    res.json({
      success: true,
      data: {
        ...returnData,
        photos
      }
    });
  } catch (error: any) {
    console.error('Error getting return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get return'
    });
  }
};

// Update return status and notes
export const updateReturn = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    const user = req.user as any;
    
    const existingReturn = await storage.getReturn(returnId);
    
    if (!existingReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }

    // Update status-specific timestamps
    const updateData = { ...req.body };
    const now = new Date();
    
    if (updateData.status) {
      switch (updateData.status) {
        case 'inspected':
          updateData.inspectionDate = now;
          break;
        case 'refund_initiated':
          updateData.refundInitiatedDate = now;
          break;
        case 'completed':
          updateData.completedDate = now;
          break;
      }
    }

    const updatedReturn = await storage.updateReturn(returnId, updateData);
    
    // Send email notification if status changed
    if (updateData.status && updateData.status !== existingReturn.status && updatedReturn) {
      try {
        // Get seller information
        const seller = await storage.getUser(updatedReturn.sellerId);
        if (seller && seller.email) {
          await sendStatusUpdateEmail(
            updatedReturn, 
            seller.email, 
            updateData.status, 
            updateData.adminNotes
          );
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the update if email fails
      }
    }
    
    res.json({
      success: true,
      data: updatedReturn
    });
  } catch (error: any) {
    console.error('Error updating return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update return'
    });
  }
};

// Update seller notes for their own return
export const updateSellerNotes = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    const user = req.user as any;
    const { sellerNotes } = req.body;
    
    const existingReturn = await storage.getReturn(returnId);
    
    if (!existingReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }

    // Check if the return belongs to the current user
    if (existingReturn.sellerId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own returns'
      });
    }

    const updatedReturn = await storage.updateReturn(returnId, { 
      sellerNotes,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      data: updatedReturn
    });
  } catch (error: any) {
    console.error('Error updating seller notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update seller notes'
    });
  }
};

// Upload photos for a return
export const uploadReturnPhotos = async (req: Request, res: Response) => {
  try {
    console.log('Photo upload request received for return ID:', req.params.id);
    const returnId = parseInt(req.params.id);
    const user = req.user as any;
    const files = req.files as Express.Multer.File[];
    
    console.log('Files received:', files?.length || 0);
    console.log('User ID:', user?.id);
    
    if (!files || files.length === 0) {
      console.log('No files uploaded');
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    console.log('Checking if return exists:', returnId);
    const returnData = await storage.getReturn(returnId);
    
    if (!returnData) {
      console.log('Return not found:', returnId);
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }

    console.log('Return found, processing files...');
    const uploadedPhotos = [];
    
    for (const file of files) {
      console.log('Processing file:', file.filename);
      const photoData = {
        returnId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/returns/${file.filename}`,
        uploadedBy: user.id
      };
      
      console.log('Creating photo record in database:', photoData);
      const photo = await storage.createReturnPhoto(photoData);
      console.log('Photo record created:', photo.id);
      uploadedPhotos.push(photo);
    }
    
    console.log('All photos processed successfully, count:', uploadedPhotos.length);
    
    // Send email notification to seller about photo upload (only if uploaded by admin)
    if (user.role === 'admin' && uploadedPhotos.length > 0) {
      try {
        console.log('Attempting to send photo upload email for seller ID:', returnData.sellerId);
        const seller = await storage.getUser(returnData.sellerId);
        console.log('Seller found:', seller ? `${seller.name} (${seller.email})` : 'not found');
        if (seller && seller.email) {
          console.log('Sending photo upload email to:', seller.email);
          await sendPhotoUploadEmail(returnData, seller.email, uploadedPhotos.length);
          console.log('Photo upload email sent successfully');
        } else {
          console.log('No seller email found, skipping email notification');
        }
      } catch (emailError) {
        console.error('Failed to send photo upload email:', emailError);
        // Don't fail the upload if email fails
      }
    }
    
    res.json({
      success: true,
      data: uploadedPhotos
    });
  } catch (error: any) {
    console.error('Error uploading return photos:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photos',
      error: error.message
    });
  }
};

// Get returns by filters
export const getReturnsByFilter = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const sellerId = user.role === 'admin' ? 
      (req.query.sellerId ? parseInt(req.query.sellerId as string) : user.id) : 
      user.id;
    
    const { status, orderNumber, startDate, endDate } = req.query;
    
    let returns;
    
    if (status) {
      returns = await storage.getReturnsByStatus(sellerId, status as string);
    } else if (orderNumber) {
      returns = await storage.getReturnsByOrderNumber(sellerId, orderNumber as string);
    } else if (startDate && endDate) {
      returns = await storage.getReturnsByDateRange(
        sellerId, 
        new Date(startDate as string), 
        new Date(endDate as string)
      );
    } else {
      returns = await storage.getReturns(sellerId);
    }
    
    res.json({
      success: true,
      data: returns
    });
  } catch (error: any) {
    console.error('Error getting filtered returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get returns'
    });
  }
};

// Get returns report
export const getReturnsReport = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const sellerId = user.role === 'admin' ? 
      (req.query.sellerId ? parseInt(req.query.sellerId as string) : user.id) : 
      user.id;
    
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const { format } = req.query;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const returns = await storage.getReturnsByDateRange(sellerId, startDate, endDate);
    
    if (format === 'csv' || format === 'excel') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Returns Report');
      
      // Add headers
      worksheet.columns = [
        { header: 'Return ID', key: 'id', width: 10 },
        { header: 'Sender Name', key: 'senderName', width: 20 },
        { header: 'Tracking Carrier', key: 'trackingCarrier', width: 15 },
        { header: 'Tracking Number', key: 'trackingNumber', width: 20 },
        { header: 'Order Number', key: 'orderNumber', width: 15 },
        { header: 'Product Name', key: 'productName', width: 25 },
        { header: 'Return Reason', key: 'returnReason', width: 30 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Created Date', key: 'createdAt', width: 15 },
        { header: 'Updated Date', key: 'updatedAt', width: 15 },
        { header: 'Admin Notes', key: 'adminNotes', width: 30 }
      ];
      
      // Add data
      returns.forEach(returnItem => {
        worksheet.addRow({
          id: returnItem.id,
          senderName: returnItem.senderName,
          trackingCarrier: returnItem.trackingCarrier,
          trackingNumber: returnItem.trackingNumber,
          orderNumber: returnItem.orderNumber || '',
          productName: returnItem.productName || '',
          returnReason: returnItem.returnReason || '',
          status: returnItem.status,
          createdAt: returnItem.createdAt ? new Date(returnItem.createdAt).toLocaleDateString() : '',
          updatedAt: returnItem.updatedAt ? new Date(returnItem.updatedAt).toLocaleDateString() : '',
          adminNotes: returnItem.adminNotes || ''
        });
      });
      
      // Style headers
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
      
      const filename = `returns_report_${month}_${year}`;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return workbook.csv.write(res);
      } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        return workbook.xlsx.write(res);
      }
    }
    
    const report = await storage.getReturnsReport(sellerId, year, month);
    
    res.json({
      success: true,
      data: report,
      period: `${month}/${year}`,
      count: returns.length
    });
  } catch (error: any) {
    console.error('Error getting returns report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

// Get photos for a return
export const getReturnPhotos = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    
    if (!returnId || isNaN(returnId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid return ID'
      });
    }
    
    const photos = await storage.getReturnPhotos(returnId);
    
    res.json({
      success: true,
      data: photos
    });
  } catch (error: any) {
    console.error('Error getting return photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get photos'
    });
  }
};

// Delete a return photo
export const deleteReturnPhoto = async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);
    
    const deleted = await storage.deleteReturnPhoto(photoId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting return photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo'
    });
  }
};

// Toggle controlled status for a return
export const toggleReturnControlled = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    const user = req.user as any;
    
    if (!returnId || isNaN(returnId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid return ID'
      });
    }
    
    // Check if the return exists and belongs to the current user (unless admin)
    const existingReturn = await storage.getReturn(returnId);
    if (!existingReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    // Only allow sellers to control their own returns or admins to control any return
    if (user.role !== 'admin' && existingReturn.sellerId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only control your own returns'
      });
    }
    
    const updatedReturn = await storage.toggleReturnControlled(returnId);
    
    if (!updatedReturn) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update return'
      });
    }
    
    res.json({
      success: true,
      data: updatedReturn,
      message: `Return marked as ${updatedReturn.isControlled ? 'controlled' : 'not controlled'}`
    });
  } catch (error: any) {
    console.error('Error toggling return controlled status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update controlled status'
    });
  }
};

// Assign return to user (Admin only)
export const assignReturn = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    const { userId } = req.body;
    const user = req.user as any;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const updatedReturn = await storage.assignReturnToUser(returnId, userId, user.id);
    
    if (!updatedReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    // Send assignment notification email
    try {
      const assignedUser = await storage.getUser(userId);
      if (assignedUser) {
        await returnNotificationService.sendAssignmentNotification(updatedReturn, assignedUser, user);
      }
    } catch (error) {
      console.error('Failed to send assignment notification:', error);
    }
    
    res.json({
      success: true,
      data: updatedReturn,
      message: 'Return assigned successfully'
    });
  } catch (error: any) {
    console.error('Error assigning return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign return'
    });
  }
};

// Unassign return (Admin only)
export const unassignReturn = async (req: Request, res: Response) => {
  try {
    const returnId = parseInt(req.params.id);
    
    const updatedReturn = await storage.unassignReturn(returnId);
    
    if (!updatedReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedReturn,
      message: 'Return unassigned successfully'
    });
  } catch (error: any) {
    console.error('Error unassigning return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign return'
    });
  }
};

// Get assigned returns for a user
export const getAssignedReturns = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = req.user as any;
    
    // Users can only see their own assigned returns, admins can see any user's
    if (user.role !== 'admin' && user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const assignedReturns = await storage.getAssignedReturns(userId);
    
    res.json({
      success: true,
      data: assignedReturns
    });
  } catch (error: any) {
    console.error('Error getting assigned returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned returns'
    });
  }
};