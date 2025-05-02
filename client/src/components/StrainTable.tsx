import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Info } from 'lucide-react';
import { BotMascotLoader } from './ui/bot-mascot-loader';

export type Strain = {
  id: number;
  name: string;
  type: string;
  thc_content: string;
  cbd_content: string;
  flavor_profile: string;
  effects: string;
  description: string;
  image_url: string;
  created_at: string;
}

export function StrainTable() {
  const [selectedStrain, setSelectedStrain] = useState<Strain | null>(null);
  
  const { data: strains, isLoading, error } = useQuery<Strain[]>({
    queryKey: ['/api/strains'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <BotMascotLoader 
          size="lg" 
          text="Loading strain data" 
          type="strains" 
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading strains: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
      case 'indica':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'sativa':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'hybrid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>THC</TableHead>
            <TableHead>CBD</TableHead>
            <TableHead>Flavor Profile</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {strains?.map((strain: Strain) => (
            <TableRow key={strain.id}>
              <TableCell className="font-medium">{strain.name}</TableCell>
              <TableCell>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(strain.type)}`}>
                  {strain.type}
                </span>
              </TableCell>
              <TableCell>{strain.thc_content}</TableCell>
              <TableCell>{strain.cbd_content}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {strain.flavor_profile.split(',').map((flavor, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {flavor.trim()}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedStrain(strain)}
                    >
                      <Info className="h-4 w-4 mr-1" /> Details
                    </Button>
                  </DialogTrigger>
                  {selectedStrain && selectedStrain.id === strain.id && (
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl">{strain.name}</DialogTitle>
                        <DialogDescription className="flex items-center mt-2">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(strain.type)}`}>
                            {strain.type}
                          </span>
                          <span className="ml-2">THC: {strain.thc_content}</span>
                          <span className="ml-2">CBD: {strain.cbd_content}</span>
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                        <div>
                          {strain.image_url && (
                            <img
                              src={strain.image_url}
                              alt={strain.name}
                              className="w-full h-auto rounded-lg object-cover"
                            />
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-1">Description</h3>
                            <p className="text-sm text-gray-600">{strain.description}</p>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-1">Effects</h3>
                            <div className="flex flex-wrap gap-1">
                              {strain.effects.split(',').map((effect, index) => (
                                <Badge key={index} className="bg-blue-50 text-blue-700 border-blue-200">
                                  {effect.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-1">Flavor Profile</h3>
                            <div className="flex flex-wrap gap-1">
                              {strain.flavor_profile.split(',').map((flavor, index) => (
                                <Badge key={index} variant="outline">
                                  {flavor.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}