
import React, { useCallback } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_MB } from '../constants';
import { FileUpload } from '../types';

interface FileUploaderProps {
  onFileSelect: (file: FileUpload) => void;
  isLoading: boolean;
  onProcessingStart?: () => void;
  onProcessingError?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading, onProcessingStart, onProcessingError }) => {
  const handleFile = useCallback(async (file: File) => {
    const isAccepted = ACCEPTED_IMAGE_TYPES.some(type => 
      file.type === type || 
      file.name.toLowerCase().endsWith(type) ||
      (type === '.psd' && (file.name.toLowerCase().endsWith('.psd') || file.type === 'image/vnd.adobe.photoshop'))
    );

    if (!isAccepted) {
      alert('Please upload a supported file: PNG, JPG, WEBP, or PSD.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File size must be less than ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (file.name.toLowerCase().endsWith('.psd') || file.type === 'image/vnd.adobe.photoshop') {
       if (onProcessingStart) onProcessingStart();
       
       setTimeout(async () => {
           try {
               const PSD = (window as any).PSD;
               if (!PSD) throw new Error('PSD parser not loaded');
      
               const url = URL.createObjectURL(file);
               const psd = await PSD.fromURL(url);
               const image = psd.image.toBase64();
               
               onFileSelect({
                  file,
                  previewUrl: image,
                  base64: image
               });
           } catch (innerError) {
               console.error(innerError);
               alert("Failed to parse PSD file locally.");
               if (onProcessingError) onProcessingError();
           }
       }, 100);
       return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onFileSelect({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: result
      });
    };
    reader.readAsDataURL(file);
  }, [onFileSelect, onProcessingStart, onProcessingError]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`relative w-full h-52 border-2 border-dashed rounded-3xl transition-all duration-500 flex flex-col items-center justify-center cursor-pointer group overflow-hidden
        ${isLoading ? 'border-indigo-500/50 bg-indigo-500/5 cursor-wait' : 'border-slate-700/50 hover:border-indigo-500/80 hover:bg-indigo-500/5 bg-slate-900/20 shadow-inner'}
      `}
    >
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.psd"
        onChange={onInputChange}
        disabled={isLoading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
      />
      
      {isLoading ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Loading Module</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4 transition-all duration-500 transform group-hover:scale-105">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center group-hover:bg-indigo-600/20 group-hover:border-indigo-500/50 transition-all">
            <i className="fas fa-arrow-up-from-bracket text-lg text-slate-500 group-hover:text-indigo-500"></i>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-100">Click to Select Blueprint</p>
            <p className="text-[9px] mt-2 text-slate-600 font-bold uppercase tracking-widest">Supports PSD • PNG • JPG</p>
          </div>
        </div>
      )}
    </div>
  );
};
