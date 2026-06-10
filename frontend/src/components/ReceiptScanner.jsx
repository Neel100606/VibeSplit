import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, Sparkles, AlertCircle, FileImage, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * ReceiptScanner Component
 * Renders a sleek drag-and-drop zone with a glassmorphism dark-mode aesthetic.
 * Allows file uploads via browse or drag-and-drop, displays an image preview,
 * sends the image to the backend scanReceipt endpoint, and triggers a callback on success.
 */
export default function ReceiptScanner({ onScanSuccess }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    // Validate size (5MB limit)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit.');
      return;
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP receipt images are supported.');
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl('');
    setError('');
  };

  const handleScanReceipt = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/scan-receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        onScanSuccess(response.data.items);
        // Reset scanner states on success
        setFile(null);
        setPreviewUrl('');
      } else {
        setError(response.data.error || 'Failed to scan receipt.');
      }
    } catch (err) {
      console.error('Receipt upload error:', err);
      setError(err.response?.data?.error || 'An error occurred while uploading the receipt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#0A0A0A]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Visual background accents */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-6">
          <div className="relative">
            {/* Spinning gradient ring */}
            <div className="w-20 h-20 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            {/* Animated scanning laser line */}
            <div className="absolute top-0 left-0 w-20 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce mt-10" />
          </div>
          <div className="text-center space-y-2 max-w-xs">
            <h4 className="text-lg font-extrabold tracking-tight text-white font-outfit">Reading Receipt</h4>
            <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest animate-pulse">Gemini is reading your receipt...</p>
            <p className="text-xs text-slate-400">Extracting line items and prices...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />

          {!file ? (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={triggerFileInput}
              className={`flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'border-white/10 bg-[#0D0F12]/60 hover:border-white/20 hover:bg-[#13151A]/60'
              }`}
            >
              <div className="p-3 bg-white/5 rounded-2xl mb-3">
                <UploadCloud className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-200 text-center">
                Drag & drop receipt, or <span className="text-emerald-500 hover:underline">browse</span>
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-widest">
                PNG, JPG, WEBP (Max 5MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative flex items-center gap-4 p-4 bg-[#0D0F12]/80 border border-white/5 rounded-2xl">
                {previewUrl ? (
                  <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black">
                    <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center justify-center w-16 h-16 bg-white/5 rounded-xl border border-white/10">
                    <FileImage className="w-8 h-8 text-slate-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleScanReceipt}
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-black py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                Scan Receipt with AI
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-normal">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
