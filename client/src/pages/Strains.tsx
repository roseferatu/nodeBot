import React from 'react';
import { StrainTable } from '@/components/StrainTable';

export default function Strains() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">kUShCOOKIES Strain Database</h1>
          <p className="text-gray-500 mt-2">
            Browse our curated collection of premium cannabis strains with detailed information about effects, flavors, and more.
          </p>
        </div>
        
        <div className="mt-6">
          <StrainTable />
        </div>
      </div>
    </div>
  );
}