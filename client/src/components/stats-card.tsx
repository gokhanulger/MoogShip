import React from 'react';
import { 
  Package, 
  PackageOpen,
  PackageCheck,
  Clock, 
  Hourglass,
  CheckCircle, 
  Truck,
  Send,
  Globe, 
  TrendingUp,
  TrendingDown,
  LucideIcon
} from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  iconColor: string;
  trend?: number;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconColor,
  trend
}: StatsCardProps) {
  // Icon component mapping
  const getIcon = (): React.ReactNode => {
    const IconProps = {
      className: "h-6 w-6 text-white",
      strokeWidth: 2
    };
    
    switch (icon) {
      case "package":
        return <Package {...IconProps} />;
      case "package-open":
        return <PackageOpen {...IconProps} />;
      case "package-check":
        return <PackageCheck {...IconProps} />;
      case "clock":
        return <Clock {...IconProps} />;
      case "hourglass":
        return <Hourglass {...IconProps} />;
      case "check-circle":
        return <CheckCircle {...IconProps} />;
      case "truck":
        return <Truck {...IconProps} />;
      case "send":
        return <Send {...IconProps} />;
      case "globe":
        return <Globe {...IconProps} />;
      default:
        return <Package {...IconProps} />;
    }
  };
  
  // Trend icon component
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;
  
  // Trend color
  const trendColor = trend && trend > 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="relative bg-white pt-5 px-4 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
      <dt>
        <div className={`absolute ${iconColor} rounded-md p-3`}>
          {getIcon()}
        </div>
        <p className="ml-16 text-sm font-medium text-gray-500 truncate">{title}</p>
      </dt>
      <dd className="ml-16 pb-6 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        
        {trend && (
          <p className={`ml-2 flex items-baseline text-sm font-semibold ${trendColor}`}>
            <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            <span className="sr-only">{trend > 0 ? 'Increased' : 'Decreased'} by</span>
            {Math.abs(trend)}%
          </p>
        )}
      </dd>
    </div>
  );
}
