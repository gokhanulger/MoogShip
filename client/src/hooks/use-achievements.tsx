import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Check, Star, Award, TrendingUp, Zap } from 'lucide-react';

// Define achievement types
export type AchievementType = 
  | 'first_shipment'
  | 'five_shipments'
  | 'ten_shipments'
  | 'filled_all_fields'
  | 'added_multiple_packages'
  | 'used_templates'
  | 'international_shipment'
  | 'hmrc_shipment'
  | 'eu_shipment'
  | 'saved_recipient';

// Define achievement data structure
interface Achievement {
  id: AchievementType;
  title: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  earnedAt?: Date;
}

// Create initial achievements list
const createInitialAchievements = (): Record<AchievementType, Achievement> => ({
  first_shipment: {
    id: 'first_shipment',
    title: 'First Shipment',
    description: 'Created your first shipment',
    icon: <Check className="h-5 w-5 text-green-500" />,
    earned: false,
  },
  five_shipments: {
    id: 'five_shipments',
    title: 'Shipping Pro',
    description: 'Created 5 shipments',
    icon: <Star className="h-5 w-5 text-yellow-500" />,
    earned: false,
  },
  ten_shipments: {
    id: 'ten_shipments',
    title: 'Shipping Master',
    description: 'Created 10 shipments',
    icon: <Award className="h-5 w-5 text-purple-500" />,
    earned: false,
  },
  filled_all_fields: {
    id: 'filled_all_fields',
    title: 'Detail Oriented',
    description: 'Filled all optional fields in a shipment',
    icon: <Check className="h-5 w-5 text-blue-500" />,
    earned: false,
  },
  added_multiple_packages: {
    id: 'added_multiple_packages',
    title: 'Bulk Shipper',
    description: 'Added multiple packages to a single shipment',
    icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
    earned: false,
  },
  used_templates: {
    id: 'used_templates',
    title: 'Efficient Shipper',
    description: 'Used package templates for quick shipment',
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    earned: false,
  },
  international_shipment: {
    id: 'international_shipment',
    title: 'Global Trader',
    description: 'Created an international shipment',
    icon: <Star className="h-5 w-5 text-sky-500" />,
    earned: false,
  },
  hmrc_shipment: {
    id: 'hmrc_shipment',
    title: 'UK Shipping Expert',
    description: 'Successfully shipped to UK with HMRC',
    icon: <Award className="h-5 w-5 text-red-500" />,
    earned: false,
  },
  eu_shipment: {
    id: 'eu_shipment',
    title: 'EU Shipping Expert',
    description: 'Successfully shipped to EU with IOSS',
    icon: <Award className="h-5 w-5 text-blue-500" />,
    earned: false,
  },
  saved_recipient: {
    id: 'saved_recipient',
    title: 'Address Book Master',
    description: 'Saved a recipient for future shipments',
    icon: <Check className="h-5 w-5 text-emerald-500" />,
    earned: false,
  },
});

// Create the hook
export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Record<AchievementType, Achievement>>(createInitialAchievements);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Load achievements from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    try {
      const savedAchievements = localStorage.getItem(`moogship_achievements_${user.id}`);
      if (savedAchievements) {
        const parsed = JSON.parse(savedAchievements);
        
        // Convert saved date strings back to Date objects
        Object.keys(parsed).forEach((key) => {
          if (parsed[key].earnedAt) {
            parsed[key].earnedAt = new Date(parsed[key].earnedAt);
          }
        });
        
        setAchievements(parsed);
        setTotalEarned(Object.values(parsed).filter(a => a.earned).length);
      }
    } catch (error) {
      console.error('Error loading achievements', error);
    }
  }, [user]);
  
  // Save achievements to localStorage when they change
  useEffect(() => {
    if (!user) return;
    
    try {
      localStorage.setItem(`moogship_achievements_${user.id}`, JSON.stringify(achievements));
      setTotalEarned(Object.values(achievements).filter(a => a.earned).length);
    } catch (error) {
      
    }
  }, [achievements, user]);
  
  // Function to mark an achievement as earned
  const earnAchievement = (id: AchievementType) => {
    if (!achievements[id] || achievements[id].earned) return;
    
    const updatedAchievement = {
      ...achievements[id],
      earned: true,
      earnedAt: new Date(),
    };
    
    setAchievements(prev => ({
      ...prev,
      [id]: updatedAchievement,
    }));
    
    // Show a toast notification
    toast({
      title: "🎉 Achievement Unlocked!",
      description: `${updatedAchievement.title}: ${updatedAchievement.description}`,
      duration: 5000,
    });
  };
  
  // Function to check if shipment count achievements should be earned
  const checkShipmentCountAchievements = (count: number) => {
    if (count >= 1) earnAchievement('first_shipment');
    if (count >= 5) earnAchievement('five_shipments');
    if (count >= 10) earnAchievement('ten_shipments');
  };
  
  // Function to check if a shipment has all fields filled
  const checkAllFieldsFilled = (shipment: any) => {
    // Example fields that would constitute a "complete" shipment
    const requiredFields = [
      'receiverName',
      'receiverAddress',
      'receiverCity',
      'receiverCountry',
      'receiverPostalCode',
      'receiverPhone',
      'receiverEmail', // This might be optional but we're checking for completeness
      'packageWeight',
      'packageLength',
      'packageWidth',
      'packageHeight',
      'packageContents',
    ];
    
    // Check if all required fields have values
    const isComplete = requiredFields.every(field => 
      shipment[field] !== undefined && 
      shipment[field] !== null && 
      shipment[field] !== ''
    );
    
    if (isComplete) {
      earnAchievement('filled_all_fields');
    }
  };
  
  // Function to check various shipping achievements based on destination
  const checkDestinationAchievements = (country: string) => {
    // If country code is not US or TR, it's international
    if (country && !['US', 'TR'].includes(country)) {
      earnAchievement('international_shipment');
      
      // Check for EU shipment
      const euCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 
        'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 
        'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 
        'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
      ];
      
      if (euCountries.includes(country)) {
        earnAchievement('eu_shipment');
      }
      
      // Check for UK/Sweden shipment with HMRC
      if (['GB', 'SE'].includes(country)) {
        earnAchievement('hmrc_shipment');
      }
    }
  };
  
  // Function to check if multiple packages were added
  const checkMultiplePackages = (packageCount: number) => {
    if (packageCount > 1) {
      earnAchievement('added_multiple_packages');
    }
  };
  
  // Function to mark the "used templates" achievement
  const markTemplateUsed = () => {
    earnAchievement('used_templates');
  };
  
  // Function to mark saved recipient achievement
  const markRecipientSaved = () => {
    earnAchievement('saved_recipient');
  };
  
  return {
    achievements,
    totalEarned,
    earnAchievement,
    checkShipmentCountAchievements,
    checkAllFieldsFilled,
    checkDestinationAchievements,
    checkMultiplePackages,
    markTemplateUsed,
    markRecipientSaved
  };
};

export default useAchievements;