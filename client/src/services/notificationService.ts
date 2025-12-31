// Global notification service for admin fast tracking notifications
class NotificationService {
  private lastNotificationCount = 0;
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private isAdmin = false;
  private sharedAudioContext: AudioContext | null = null;
  private audioEnabled = false;

  initialize(isAdmin: boolean) {
    this.isAdmin = isAdmin;
    if (isAdmin && !this.isPolling) {
      this.startPolling();
      this.requestNotificationPermission();
    }
  }

  private async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  private startPolling() {
    this.isPolling = true;
    this.pollInterval = setInterval(() => {
      this.checkForNewNotifications();
    }, 60000); // Chrome-optimized: Check every 60 seconds to reduce API load

    // Initial check after short delay to allow initialization
    setTimeout(() => {
      this.checkForNewNotifications();
    }, 2000);
  }

  private async checkForNewNotifications() {
    if (!this.isAdmin) return;

    try {
      const response = await fetch('/api/admin/fast-tracking-notifications', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const notifications = await response.json();
        const currentCount = notifications.filter((n: any) => !n.isRead).length;

        console.log('🔔 Notification check:', {
          currentCount,
          lastCount: this.lastNotificationCount,
          hasIncrease: currentCount > this.lastNotificationCount,
          isInitial: this.lastNotificationCount === 0
        });

        // If we have more unread notifications than before, play sound and show notification
        // Allow sound on first detection too if count > 0
        if (currentCount > this.lastNotificationCount) {
          console.log('🔔 GLOBAL SERVICE TRIGGERING SOUND - New fast tracking notification detected!', currentCount, 'total unread');
          console.log('🔊 About to call playNotificationSound()...');
          
          try {
            this.playNotificationSound();
            console.log('🔊 playNotificationSound() called successfully');
          } catch (error) {
            console.error('🔊 Error calling playNotificationSound():', error);
          }
          
          this.showBrowserNotification(currentCount);
          
          // Also trigger a page-wide event for any components listening
          window.dispatchEvent(new CustomEvent('newNotification', { detail: { count: currentCount } }));
        }

        this.lastNotificationCount = currentCount;
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  private playNotificationSound() {
    console.log('🔊 playNotificationSound() called, audioEnabled:', this.audioEnabled, 'sharedContext exists:', !!this.sharedAudioContext);
    
    // Use shared audio context if available and enabled
    if (this.sharedAudioContext && this.audioEnabled) {
      console.log('🔊 Using shared AudioContext, state:', this.sharedAudioContext.state);
      if (this.sharedAudioContext.state === 'running') {
        console.log('🔊 Shared AudioContext is running, playing sound!');
        this.playActualSound(this.sharedAudioContext);
        return;
      } else if (this.sharedAudioContext.state === 'suspended') {
        console.log('🔊 Shared AudioContext suspended, attempting resume...');
        this.sharedAudioContext.resume().then(() => {
          console.log('🔊 Shared AudioContext resumed, playing sound!');
          this.playActualSound(this.sharedAudioContext!);
        }).catch(err => {
          console.log('🔊 Failed to resume shared AudioContext:', err);
        });
        return;
      }
    }
    
    // Fallback: create new context if no shared context available
    console.log('🔊 No shared context available or not enabled, creating new AudioContext...');
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 New AudioContext created, state:', audioContext.state);
        
        if (audioContext.state === 'suspended') {
          console.log('🔊 New audio context suspended, attempting to resume...');
          audioContext.resume().then(() => {
            console.log('🔊 New audio context resumed successfully');
            this.playActualSound(audioContext);
          }).catch(err => {
            console.log('🔊 Failed to resume new audio context:', err);
          });
          return;
        }
        
        this.playActualSound(audioContext);
      } catch (error) {
        console.log('🔊 Could not create new AudioContext:', error);
      }
    } else {
      console.log('🔊 AudioContext not available in browser');
    }
  }

  // Method to enable audio with user interaction (called by test button)
  enableAudio() {
    console.log('🔊 enableAudio() called - User interaction detected');
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        if (!this.sharedAudioContext) {
          this.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('🔊 Shared AudioContext created, state:', this.sharedAudioContext.state);
        }
        
        if (this.sharedAudioContext.state === 'suspended') {
          console.log('🔊 Resuming suspended AudioContext...');
          this.sharedAudioContext.resume().then(() => {
            console.log('🔊 Shared AudioContext resumed successfully, state:', this.sharedAudioContext?.state);
            this.audioEnabled = true;
          }).catch(err => {
            console.log('🔊 Failed to resume shared AudioContext:', err);
          });
        } else {
          this.audioEnabled = true;
          console.log('🔊 Audio already enabled, state:', this.sharedAudioContext.state);
        }
      } catch (error) {
        console.log('🔊 Error enabling audio:', error);
      }
    }
  }

  // Public method to play sound (called by bell component)
  playSound() {
    console.log('🔊 PUBLIC playSound() called from notification service');
    this.playNotificationSound();
  }

  // Public method for triggering test sound with audio enabling
  triggerTestSound() {
    console.log('🔊 PUBLIC triggerTestSound() called from notification service');
    this.enableAudio();
    // Add small delay to ensure audio context is enabled before playing
    setTimeout(() => {
      this.playNotificationSound();
    }, 100);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();