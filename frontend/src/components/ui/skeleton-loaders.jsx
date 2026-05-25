import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const SkeletonCard = () => (
  <Card>
    <CardHeader>
      <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-2"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    </CardContent>
  </Card>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="bg-muted p-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
    <div className="divide-y">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart = () => (
  <Card>
    <CardHeader>
      <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-end justify-around p-4 gap-2">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="w-full bg-gray-200 dark:bg-gray-800 rounded-t animate-pulse"
            style={{ height: `${Math.random() * 100}%` }}
          ></div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const SkeletonList = ({ items = 5 }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
        </div>
        <div className="w-20 h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2"></div>
            <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SkeletonChart />
      <SkeletonCard />
    </div>
  </div>
);

export const SkeletonMap = () => (
  <div className="w-full h-[600px] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-center space-y-2">
      <div className="w-16 h-16 mx-auto bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"></div>
      <div className="h-4 w-32 mx-auto bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
    </div>
  </div>
);

export const SkeletonButton = ({ className = '' }) => (
  <div className={`h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse ${className}`}></div>
);

export const SkeletonAvatar = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse`}></div>
  );
};

export const SkeletonBadge = () => (
  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse inline-block"></div>
);

// Shimmer effect skeleton
export const ShimmerCard = () => (
  <div className="relative overflow-hidden bg-white dark:bg-gray-950 border rounded-lg p-6">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    <div className="space-y-3">
      <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
      <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
    </div>
  </div>
);

export default {
  Card: SkeletonCard,
  Table: SkeletonTable,
  Chart: SkeletonChart,
  List: SkeletonList,
  Dashboard: SkeletonDashboard,
  Map: SkeletonMap,
  Button: SkeletonButton,
  Avatar: SkeletonAvatar,
  Badge: SkeletonBadge,
  Shimmer: ShimmerCard
};
