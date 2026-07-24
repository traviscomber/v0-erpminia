'use client';

import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MobilePhotoCaptureProps {
  onPhotoCapture: (photoData: { file: File; timestamp: string }) => void;
  loading?: boolean;
}

export function MobilePhotoCapture({ onPhotoCapture, loading }: MobilePhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setFileName(file.name);
      };
      reader.readAsDataURL(file);

      onPhotoCapture({
        file,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearPreview = () => {
    setPreview(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Card className="w-full border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          Paso 2: Foto del trabajo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview ? (
          <div className="space-y-3">
            <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-auto" />
            </div>
            <div className="text-sm text-gray-600">
              <strong>Archivo:</strong> {fileName}
            </div>
            <Button onClick={clearPreview} variant="outline" className="w-full text-red-600 border-red-300">
              <X className="w-4 h-4 mr-2" />
              Tomar otra foto
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Camera Button */}
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-blue-600 hover:bg-blue-700 h-16 text-lg"
              disabled={loading}
            >
              <Camera className="w-5 h-5 mr-2" />
              Usar cámara
            </Button>

            {/* Upload Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-blue-300 text-blue-700 h-14"
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              O cargar archivo
            </Button>
          </div>
        )}

        {/* Hidden Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </CardContent>
    </Card>
  );
}
