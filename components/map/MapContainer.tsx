'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';
import type MapView from './MapView';

const MapViewClient = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-400 font-medium">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading map environment...</span>
      </div>
    </div>
  ),
});

export default function MapContainer(props: ComponentProps<typeof MapView>) {
  return <MapViewClient {...props} />;
}
