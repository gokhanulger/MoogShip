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
      className: "h-5 w-5 text-white",
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
    <div className="bg-white px-4 py-3 shadow rounded-lg overflow-hidden flex items-center gap-3">
      <div className={`${iconColor} rounded-lg p-2.5 flex-shrink-0`}>
        {getIcon()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={`flex items-center text-xs font-medium ${trendColor}`}>
              <TrendIcon className={`h-3 w-3 mr-0.5 ${trendColor}`} />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
