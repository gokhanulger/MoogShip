/**
 * Custom hook for paginated shipment loading with dramatic performance improvements
 */
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';

interface PaginatedShipments {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ShipmentCounts {
  [key: string]: number;
}

interface UsePaginatedShipmentsOptions {
  searchTerm?: string;
  currentTab?: string;
  customerId?: string;
}

export function usePaginatedShipments(options: UsePaginatedShipmentsOptions = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const { searchTerm = "", currentTab = "pending", customerId = "" } = options;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, currentTab, customerId]);

  // Prevent duplicate requests by including all dependencies in query key
  const queryKey = ['/api/admin/shipments/paginated', page, limit, searchTerm, currentTab, customerId];

  // Load shipments with pagination - much faster than loading all at once
  const shipmentsQuery = useQuery({
    queryKey: queryKey,
    queryFn: async (): Promise<PaginatedShipments> => {

      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
        // When searching, search across all statuses instead of limiting to current tab
        // Don't add status filter when there's a search term
      } else if (currentTab && currentTab !== 'all') {
        // Only apply status filter when not searching
        params.append('status', currentTab);
      }
      
      if (customerId) {
        params.append('customerId', customerId);
      }
      
      const response = await fetch(`/api/admin/shipments/paginated?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shipments');
      }
      const result = await response.json();


      return result;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds to show status changes
    retry: 2
  });

  // Load status counts separately for dashboard stats
  const countsQuery = useQuery({
    queryKey: ['/api/admin/shipments/counts'],
    queryFn: async (): Promise<ShipmentCounts> => {

      const response = await fetch('/api/admin/shipments/counts');
      if (!response.ok) {
        throw new Error('Failed to fetch counts');
      }
      const result = await response.json();

      return result;
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 30000, // Auto-refresh every 30 seconds to update tab counters
    retry: 2
  });

  const nextPage = useCallback(() => {
    if (shipmentsQuery.data?.pagination.hasNext) {
      setPage(prev => prev + 1);
    }
  }, [shipmentsQuery.data?.pagination.hasNext]);

  const prevPage = useCallback(() => {
    if (shipmentsQuery.data?.pagination.hasPrev) {
      setPage(prev => prev - 1);
    }
  }, [shipmentsQuery.data?.pagination.hasPrev]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  return {
    // Data
    shipments: shipmentsQuery.data?.data || [],
    pagination: shipmentsQuery.data?.pagination,
    counts: countsQuery.data || {},
    
    // Loading states
    isLoading: shipmentsQuery.isLoading,
    isError: shipmentsQuery.isError,
    error: shipmentsQuery.error,
    
    // Actions
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    
    // Current state
    currentPage: page,
    currentLimit: limit,
    
    // Refresh function
    refetch: shipmentsQuery.refetch
  };
}