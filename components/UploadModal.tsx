import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, ChevronDown, Trash2, Star, Calendar as CalendarIcon } from 'lucide-react';
import { Category, Photo, Theme } from '../types';
import { GlassCard } from './GlassCard';
import EXIF from 'exif-js';

interface SmartInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  storageKey: string;
  placeholder?: string;
  theme: Theme;
  type?: string;
}

const SmartInput: React.FC<SmartInputProps> = ({ label, value, onChange, storageKey, placeholder, theme, type = 'text' }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (type !== 'text') return; // Don't use history for date inputs
    const saved = localStorage.getItem(`lumina_history_${storageKey}`);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [storageKey, type]);

  const saveToHistory = () => {
    if (type !== 'text' || !value.trim()) return;
    const newHistory = Array.from(new Set([value, ...history])).slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem(`lumina_history_${storageKey}`, JSON.stringify(newHistory));
  };

  const deleteFromHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== item);
    setHistory(newHistory);
    localStorage.setItem(`lumina_history_${storageKey}`, JSON.stringify(newHistory));
  };

  const inputClass = isDark 
    ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-white/30 placeholder:text-white/20" 
    : "bg-black/5 border-black/10 text-black focus:bg-black/5 focus:border-black/30 placeholder:text-black/30";
  
  const labelClass = isDark ? "text-white/60" : "text-black/50";
  const dropdownClass = isDark ? "bg-[#1a1f35] border-white/10 text-white/80" : "bg-white border-black/10 text-black/80";
  const dropdownHoverClass = isDark ? "hover:bg-white/10" : "hover:bg-black/5";

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={`block text-xs uppercase tracking-wider mb-1 ${labelClass}`}>{label}</label>
      <div className="relative">
        <input 
          type={type}
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          onBlur={saveToHistory}
          onFocus={() => type === 'text' && setShowHistory(true)}
          className={`w-full border rounded p-2 text-xs focus:outline-none transition-colors ${inputClass} ${type === 'date' ? 'min-h-[34px]' : ''}`}
          placeholder={placeholder}
        />
        {type === 'text' && history.length > 0 && (
          <button 
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 hover:scale-110 ${isDark ? 'text-white/30 hover:text-white' : 'text-black/30 hover:text-black'}`}
          >
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {showHistory && history.length > 0 && (
        <div className={`absolute z-50 top-full left-0 right-0 mt-1 border rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto ${dropdownClass}`}>
          {history.map((item) => (
            <div 
              key={item} 
              className={`flex justify-between items-center px-3 py-2 cursor-pointer group ${dropdownHoverClass}`}
              onClick={() => { onChange(item); setShowHistory(false); }}
            >
              <span className="truncate flex-1">{item}</span>
              <button 
                onClick={(e) => deleteFromHistory(e, item)}
                className="opacity-50 hover:opacity-100 text-red-400 hover:text-red-500 p-1 transition-opacity"
                title="删除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (photo: Photo) => void;
  theme: Theme;
  editingPhoto?: Photo | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, theme, editingPhoto }) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageDims, setImageDims] = useState<{width: number, height: number}>({ width: 0, height: 0 });
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(Category.LANDSCAPE);
  const [rating, setRating] = useState(5);
  
  // EXIF Form State
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [focalLength, setFocalLength] = useState('');

  const isDark = theme === 'dark';
  const textPrimary = isDark ? "text-white" : "text-black";
  const textSecondary = isDark ? "text-white/60" : "text-black/60";

  // Init for Edit Mode
  useEffect(() => {
    if (isOpen && editingPhoto) {
      setImageUrl(editingPhoto.url);
      setTitle(editingPhoto.title);
      setCategory(editingPhoto.category);
      setRating(editingPhoto.rating || 0);
      setImageDims({ width: editingPhoto.width || 0, height: editingPhoto.height || 0 });
      
      setCamera(editingPhoto.exif.camera);
      setLens(editingPhoto.exif.lens);
      setAperture(editingPhoto.exif.aperture);
      setShutter(editingPhoto.exif.shutterSpeed);
      setIso(editingPhoto.exif.iso);
      setLocation(editingPhoto.exif.location);
      setDate(editingPhoto.exif.date);
      setFocalLength(editingPhoto.exif.focalLength || '');
    } else if (isOpen && !editingPhoto) {
      // Reset for new upload
      setImageUrl(''); setImageDims({width:0,height:0}); setTitle(''); setRating(5);
      setCamera(''); setLens(''); setAperture(''); setShutter(''); setIso(''); setLocation(''); setFocalLength('');
      
      // Default date to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [isOpen, editingPhoto]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      
      // 1. Read Image for Preview and Dimensions
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
           setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
           setImageUrl(base64);
           setLoading(false);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);

      // 2. Read EXIF Data safely
      try {
        EXIF.getData(file as any, function(this: any) {
            if (!this || !this.exifdata) return;

            // Helper to get formatted value
            const getTag = (tag: string) => EXIF.getTag(this, tag);

            const make = getTag('Make');
            const model = getTag('Model');
            if (model) {
                const cleanMake = make ? make.replace(/\0/g, '').trim() : '';
                const cleanModel = model.replace(/\0/g, '').trim();
                setCamera(cleanModel.startsWith(cleanMake) ? cleanModel : `${cleanMake} ${cleanModel}`.trim());
            }

            const isoVal = getTag('ISOSpeedRatings');
            if (isoVal) setIso(String(isoVal));

            const fNumber = getTag('FNumber');
            if (fNumber) setAperture(`f/${Number(fNumber).toFixed(1)}`.replace('.0', ''));

            const exposure = getTag('ExposureTime');
            if (exposure) {
                // ExposureTime can be a Number or a Fraction object
                if (typeof exposure === 'number') {
                    setShutter(exposure < 1 ? `1/${Math.round(1/exposure)}s` : `${exposure}s`);
                } else if (exposure.numerator && exposure.denominator) {
                     setShutter(`${exposure.numerator}/${exposure.denominator}s`);
                }
            }

            const focal = getTag('FocalLength');
            if (focal) {
                 const fVal = typeof focal === 'number' ? focal : focal.numerator / focal.denominator;
                 setFocalLength(`${Math.round(fVal)}mm`);
            }

            const dateTag = getTag('DateTimeOriginal');
            if (dateTag) {
                // Format: "2023:10:24 14:30:00" -> "2023-10-24"
                const parts = dateTag.split(' ')[0].replace(/:/g, '-');
                setDate(parts);
            }
        });
      } catch (err) {
        console.error("EXIF Extraction failed:", err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;

    const photoData: Photo = {
      id: editingPhoto ? editingPhoto.id : Date.now().toString(),
      url: imageUrl,
      title: title || '未命名作品',
      category: category,
      width: imageDims.width,
      height: imageDims.height,
      rating: rating,
      exif: { camera, lens, aperture, shutterSpeed: shutter, iso, location, date, focalLength }
    };

    onUpload(photoData);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in ${isDark ? 'bg-black/80 backdrop-blur-sm' : 'bg-white/60 backdrop-blur-md'}`}>
      <GlassCard className="w-full max-w-2xl h-[85vh] flex flex-col" hoverEffect={false} theme={theme}>
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-2 flex justify-between items-center border-b border-transparent">
            <h2 className={`text-2xl font-serif ${textPrimary}`}>{editingPhoto ? '编辑作品信息' : '上传作品'}</h2>
            <button onClick={onClose} className={`${textSecondary} hover:${textPrimary} transition-colors`}>
              <X size={24} />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Preview */}
            <div className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-colors flex-shrink-0
               ${isDark ? 'border-white/20 bg-white/5 hover:border-white/40' : 'border-black/20 bg-black/5 hover:border-black/40'}
            `}>
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <div className={`flex flex-col items-center ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                  {loading ? <Loader2 className="animate-spin mb-2" /> : <Upload size={40} className="mb-2" />}
                  <span className="text-sm">点击选择或拖拽图片</span>
                </div>
              )}
              {/* Only allow re-uploading file if not in edit mode (simplification, can be enabled if needed) */}
              {!editingPhoto && (
                 <input type="file" accept="image/jpeg,image/tiff,image/png" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1 ${textSecondary}`}>作品标题</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full border rounded-lg p-2 focus:outline-none transition-colors ${isDark ? 'bg-white/10 border-white/10 text-white focus:border-white/40' : 'bg-black/5 border-black/10 text-black focus:border-black/40'}`}
                  placeholder="例如：寂静山岭"
                />
              </div>
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1 ${textSecondary}`}>作品分类</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className={`w-full border rounded-lg p-2 focus:outline-none ${isDark ? 'bg-white/10 border-white/10 text-white [&>option]:text-black' : 'bg-black/5 border-black/10 text-black'}`}
                >
                  {Object.values(Category)
                    .filter(c => c !== Category.ALL && c !== Category.HORIZONTAL && c !== Category.VERTICAL)
                    .map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>

            {/* Rating */}
            <div>
               <label className={`block text-xs uppercase tracking-wider mb-1 ${textSecondary}`}>评级</label>
               <div className="flex gap-2">
                 {[1,2,3,4,5].map(s => (
                   <button type="button" key={s} onClick={() => setRating(s)} className="focus:outline-none hover:scale-110 transition-transform">
                     <Star 
                       size={20} 
                       className={s <= rating ? (isDark ? 'text-white fill-white' : 'text-black fill-black') : (isDark ? 'text-white/20' : 'text-black/20')} 
                     />
                   </button>
                 ))}
               </div>
            </div>

            {/* EXIF Section */}
            <div className={`border-t pt-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <div className="flex justify-between items-end mb-3">
                 <h3 className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-black/80'}`}>EXIF 参数信息</h3>
                 <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                   {editingPhoto ? '可直接修改参数' : '上传图片自动提取，或手动输入'}
                 </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <SmartInput label="相机型号" value={camera} onChange={setCamera} storageKey="camera" placeholder="Sony A7R V" theme={theme} />
                 <SmartInput label="镜头" value={lens} onChange={setLens} storageKey="lens" placeholder="24-70mm" theme={theme} />
                 <SmartInput label="焦段" value={focalLength} onChange={setFocalLength} storageKey="focal" placeholder="50mm" theme={theme} />
                 <SmartInput label="光圈" value={aperture} onChange={setAperture} storageKey="aperture" placeholder="f/2.8" theme={theme} />
                 <SmartInput label="快门" value={shutter} onChange={setShutter} storageKey="shutter" placeholder="1/200s" theme={theme} />
                 <SmartInput label="ISO" value={iso} onChange={setIso} storageKey="iso" placeholder="100" theme={theme} />
                 <div className="col-span-2">
                    <SmartInput label="地点" value={location} onChange={setLocation} storageKey="location" placeholder="东京, 日本" theme={theme} />
                 </div>
              </div>
              <div className="mt-4">
                 <SmartInput label="拍摄日期" value={date} onChange={setDate} storageKey="date" placeholder="请选择日期" theme={theme} type="date" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!imageUrl || loading}
              className={`w-full font-semibold py-3 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 shadow-lg mb-4
                ${isDark ? 'bg-white text-black shadow-white/10' : 'bg-black text-white shadow-black/10'}
              `}
            >
              {editingPhoto ? '保存修改' : '发布到作品集'}
            </button>
          </form>
        </div>
      </GlassCard>
    </div>
  );
};
