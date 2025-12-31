import React, { useState, useEffect, useRef } from 'react';
import { Bell, Package, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

interface FastTrackingNotification {
  id: number;
  shipmentId: number;
  userName: string;
  userEmail: string;
  destinationCountry: string;
  requestedAt: string;
  isRead: boolean;
}

interface AdminNotificationBellProps {
  user?: any;
}

export function AdminNotificationBell({ user }: AdminNotificationBellProps = {}) {
  const [notifications, setNotifications] = useState<FastTrackingNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastNotificationCount = useRef(0);

  // Debug user object (development only)
  // console.log('🔔 AdminNotificationBell user object:', { isAdmin: user?.role === 'admin', userExists: !!user });

  // Check if user is admin (ID 1 or role 'admin') - moved after hooks to fix React hooks order
  const isAdmin = user?.role === 'admin' || user?.id === 1 || user?.username === 'admin';
  
  // Only show for admin users - but after all hooks are declared
  if (!user || !isAdmin) {
    console.log('🔔 User not admin or not found, returning null. User:', { id: user?.id, role: user?.role, username: user?.username });
    return null;
  }

  // Add test button for triggering sound manually (development only)
  const triggerTestSound = () => {
    console.log('🔊 Manual test sound triggered from bell component!');
    
    // ONLY trigger global notification service test to enable shared audio context
    // This ensures we use the same audio context for both test and automatic sounds
    if ((window as any).notificationService) {
      console.log('🔊 Using global notification service for test sound');
      (window as any).notificationService.triggerTestSound();
    } else {
      console.log('🔊 Global notification service not available, using local sound');
      playNotificationSound();
    }
  };

  // Fetch notifications on component mount and periodically
  useEffect(() => {
    fetchNotifications();
    
    // Check for new notifications every 30 seconds with cache busting
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Play sound when new notifications arrive
  useEffect(() => {
    const currentCount = notifications.filter(n => !n.isRead).length;
    
    console.log('🔔 Bell component notification change:', {
      currentCount,
      lastCount: lastNotificationCount.current,
      notificationsLength: notifications.length,
      hasIncrease: currentCount > lastNotificationCount.current
    });
    
    if (currentCount > lastNotificationCount.current && lastNotificationCount.current > 0) {
      setHasNewNotifications(true);
      playNotificationSound();
      console.log('🔊 Bell component detected new notification, playing sound!');
    }
    
    lastNotificationCount.current = currentCount;
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      console.log('🔔 Fetching notifications for admin user:', user?.id, user?.role);
      
      // Try direct fetch with cache busting for fresh data
      const cacheBustingUrl = `/api/admin/fast-tracking-notifications?_cb=${Date.now()}`;
      const response = await fetch(cacheBustingUrl, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // Prevent browser caching
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('🔔 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
        console.log('🔔 Fetched notifications:', Array.isArray(data) ? data.length : 0, 'notifications');
      } else {
        console.error('🔔 Failed to fetch notifications:', response.status, await response.text());
        setNotifications([]);
      }
    } catch (error) {
      console.error('🔔 Error fetching notifications:', error);
      // Set empty array on error to prevent component from breaking
      setNotifications([]);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/admin/fast-tracking-notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status}`);
      }
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('🔔 Mark all as read button clicked');
      console.log('🔔 Current user:', user);
      console.log('🔔 Current notifications count:', notifications.length);
      console.log('🔔 Unread notifications count:', notifications.filter(n => !n.isRead).length);
      
      // Try direct fetch with session credentials first
      const response = await fetch('/api/admin/fast-tracking-notifications/read-all', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('🔔 Response status:', response.status);
      console.log('🔔 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔔 API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('🔔 Mark all read response:', responseData);
      
      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      // Also refresh from server to ensure consistency
      await fetchNotifications();
      
      console.log('🔔 All notifications marked as read successfully');
    } catch (error) {
      console.error('🔔 Error marking all notifications as read:', error);
    }
  };

  const playNotificationSound = () => {
    // Use the global notification service's audio context to prevent suspension
    if ((window as any).notificationService) {
      console.log('🔊 Using global notification service playSound method');
      (window as any).notificationService.playSound();
      return;
    }
    
    // Fallback to local audio context (should rarely be used now)
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        // Use the shared audio context if available, otherwise create new one
        const audioContext = (window as any).sharedAudioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Store shared context for reuse
        if (!(window as any).sharedAudioContext) {
          (window as any).sharedAudioContext = audioContext;
        }
        
        // Create multiple oscillators for layered sound
        const createOscillator = (frequency: number, type: OscillatorType, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
          
          gainNode.gain.setValueAtTime(0.8, audioContext.currentTime + startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
          
          oscillator.start(audioContext.currentTime + startTime);
          oscillator.stop(audioContext.currentTime + startTime + duration);
          
          return oscillator;
        };
        
        // Crazy multi-layered notification sequence
        // First: High energy ping-pong effect
        createOscillator(1200, 'sine', 0, 0.1);
        createOscillator(800, 'triangle', 0.05, 0.1);
        createOscillator(1000, 'square', 0.1, 0.1);
        
        // Second: Rapid fire beeps
        createOscillator(600, 'sine', 0.2, 0.05);
        createOscillator(800, 'sine', 0.25, 0.05);
        createOscillator(1000, 'sine', 0.3, 0.05);
        createOscillator(1200, 'sine', 0.35, 0.05);
        
        // Third: Dramatic sweep
        const sweepOsc = audioContext.createOscillator();
        const sweepGain = audioContext.createGain();
        sweepOsc.connect(sweepGain);
        sweepGain.connect(audioContext.destination);
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(400, audioContext.currentTime + 0.4);
        sweepOsc.frequency.exponentialRampToValueAtTime(1600, audioContext.currentTime + 0.7);
        sweepGain.gain.setValueAtTime(0.9, audioContext.currentTime + 0.4);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
        sweepOsc.start(audioContext.currentTime + 0.4);
        sweepOsc.stop(audioContext.currentTime + 0.7);
        
        // Fourth: Final attention-grabbing chord
        createOscillator(523, 'sine', 0.8, 0.3); // C note
        createOscillator(659, 'sine', 0.8, 0.3); // E note
        createOscillator(784, 'sine', 0.8, 0.3); // G note
        
        console.log('🔊 Playing crazy notification sound!');
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const formatShipmentId = (id: number) => `MOG-${id.toString().padStart(6, '0')}`;

  return (
    <>
      {/* Development: Test sound button - Always visible for testing */}
      <Button
        variant="ghost"
        size="sm"
        onClick={triggerTestSound}
        className="mr-2 text-xs text-gray-500 hover:text-blue-600"
        title="Test notification sound (Click to enable audio)"
      >
        🔊
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`relative p-2 ${hasNewNotifications ? 'animate-pulse' : ''}`}
            onClick={() => {
              setIsOpen(!isOpen);
              setHasNewNotifications(false);
            }}
          >
            <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-orange-500' : 'text-gray-500'}`} />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-96 p-0 z-[9999]" 
          align="end" 
          side="bottom" 
          sideOffset={10} 
          alignOffset={-320}
          avoidCollisions={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-2xl">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-800">Fast Tracking Requests</h3>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No tracking requests</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <Card 
                    key={notification.id}
                    className={`border-0 border-b border-gray-100 rounded-none cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <CardContent 
                      className="p-4 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click from triggering
                        markAsRead(notification.id);
                        setIsOpen(false); // Close notification dropdown
                        window.location.href = `/shipment-edit/${notification.shipmentId}`;
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${!notification.isRead ? 'bg-orange-100' : 'bg-gray-100'}`}>
                          <Package className={`h-4 w-4 ${!notification.isRead ? 'text-orange-600' : 'text-gray-500'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900">
                              {formatShipmentId(notification.shipmentId)}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                            <User className="h-3 w-3" />
                            <span>{notification.userName}</span>
                          </div>
                          
                          <p className="text-xs text-gray-500 mb-2">
                            Destination: {notification.destinationCountry}
                          </p>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(notification.requestedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/admin-shipments?filter=priority-tracking';
                  }}
                >
                  View All Priority Shipments
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}