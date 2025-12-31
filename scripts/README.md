# MoogShip Scripts Directory

This directory contains organized utility scripts, testing tools, and analysis files for the MoogShip platform.

## Directory Structure

### `/database/`
Database migration scripts, performance optimizations, and maintenance utilities.
- `add-performance-indexes.sql` - Critical database indexes for shipment query optimization

### `/testing/`
Testing scripts and validation tools for API endpoints and business logic.
- `verify-pricing-276.js` - Shipment pricing verification for specific test cases

### `/utilities/`
General utility scripts for maintenance and data processing.
- `update-pre-transit-status.js` - Automated shipment status updates
- `temp_first.ts` - Email service utilities and verification functions
- `temp_last.ts` - Temporary utility functions
- `temp_logo.ts` - Logo and branding utilities

### `/analysis/`
Data analysis files, API response examples, and diagnostic reports.
- `afs-shipment-503-analysis.md` - AFS Transport shipment analysis
- `afs-transport-response-501.json` - Sample AFS API responses
- `afs-waybill-payload-example.json` - AFS waybill payload examples
- `shipment-501-afs-payload.json` - AFS shipment payload samples
- `shipment-734-complete-payload.json` - Complete shipment data examples
- `shipment-734-payload-example.json` - Shipment payload templates

### `/documentation/`
Technical documentation and setup guides.
- `ios-icon-setup.md` - iOS mobile app icon configuration guide
- `label-fetching-system.md` - Shipping label generation system documentation

### `/csv-test-data/`
Test CSV files for bulk upload testing and validation.
- Various CSV test files for bulk shipment upload scenarios

### `/configuration/`
Configuration files and environment setup scripts.

## Usage Guidelines

1. **Database Scripts**: Always backup data before running database migrations
2. **Testing Scripts**: Run in development environment first
3. **Utilities**: Check dependencies before execution
4. **Analysis Files**: Reference for API integration and troubleshooting

## Security Notes

- Never commit API keys or sensitive credentials to these scripts
- Use environment variables for configuration
- Test all scripts in development before production use