
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Plus, LogOut, Filter, Settings, Moon, Sun, Trash2, Pencil, Check, SlidersHorizontal, Globe } from 'lucide-react';
import { GlassCard } from './components/GlassCard';
import { PhotoModal } from './components/PhotoModal';
import { UploadModal } from './components/UploadModal';
import { LoginModal } from './components/LoginModal';
import { MapView } from './components/MapView';
import { Category, Photo, Theme } from './types';

// Helper: Calculate distance between two coordinates in km (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Mock Initial Data with Coordinates
const BASE_PHOTOS: Photo[] = [
  {
    id: '1',
    url: 'https://picsum.photos/id/16/800/600',
    title: '迷雾山脉',
    category: Category.LANDSCAPE,
    width: 800,
    height: 600,
    rating: 5,
    exif: { 
      camera: 'Leica M11', lens: 'Summilux 35mm', focalLength: '35mm', aperture: 'f/5.6', shutterSpeed: '1/250s', iso: '100', location: '阿尔卑斯, 瑞士', date: '2023-10-12',
      latitude: 46.8182, longitude: 8.2275 // Switzerland
    }
  },
  {
    id: '2',
    url: 'https://picsum.photos/id/45/600/800',
    title: '城市孤独',
    category: Category.STREET,
    width: 600,
    height: 800,
    rating: 4,
    exif: { 
      camera: 'Fujifilm X-T5', lens: '23mm f/1.4', focalLength: '23mm', aperture: 'f/2.0', shutterSpeed: '1/60s', iso: '800', location: '新宿, 东京', date: '2023-11-05',
      latitude: 35.6938, longitude: 139.7034 // Tokyo
    }
  },
  {
    id: '3',
    url: 'https://picsum.photos/id/64/800/800',
    title: '静默凝视',
    category: Category.PORTRAIT,
    width: 800,
    height: 800,
    rating: 5,
    exif: { 
      camera: 'Sony A7RV', lens: '85mm GM', focalLength: '85mm', aperture: 'f/1.2', shutterSpeed: '1/1000s', iso: '100', location: 'Studio A, 纽约', date: '2023-09-20',
      latitude: 40.7128, longitude: -74.0060 // New York
    }
  },
  {
    id: '4',
    url: 'https://picsum.photos/id/28/900/600',
    title: '深林',
    category: Category.LANDSCAPE,
    width: 900,
    height: 600,
    rating: 4,
    exif: { 
      camera: 'Canon R5', lens: '15-35mm', focalLength: '15mm', aperture: 'f/8', shutterSpeed: '1/4s', iso: '50', location: '俄勒冈, 美国', date: '2023-08-15',
      latitude: 43.8041, longitude: -120.5542 // Oregon
    }
  },
  {
    id: '5',
    url: 'https://picsum.photos/id/106/800/600',
    title: '霓虹雨夜',
    category: Category.MACRO,
    width: 800,
    height: 600,
    rating: 3,
    exif: { 
      camera: 'Nikon Z8', lens: '105mm Macro', focalLength: '105mm', aperture: 'f/4', shutterSpeed: '1/200s', iso: '400', location: '伦敦, 英国', date: '2023-12-01',
      latitude: 51.5074, longitude: -0.1278 // London
    }
  },
];

// Generate more photos for demo purposes
const GENERATED_PHOTOS = Array.from({ length: 25 }).map((_, i) => {
  const base = BASE_PHOTOS[i % BASE_PHOTOS.length];
  // Slightly randomize location for demo sorting
  const latOffset = (Math.random() - 0.5) * 10;
  const lngOffset = (Math.random() - 0.5) * 10;
  
  return {
    ...base,
    id: `gen-${i}`,
    title: `${base.title} ${i + 1}`,
    url: `https://picsum.photos/id/${(i * 13) % 100 + 10}/800/${i % 2 === 0 ? 600 : 800}`,
    exif: {
      ...base.exif,
      latitude: (base.exif.latitude || 0) + latOffset,
      longitude: (base.exif.longitude || 0) + lngOffset
    }
  };
});

const INITIAL_PHOTOS = [...BASE_PHOTOS, ...GENERATED_PHOTOS];
const PAGE_SIZE = 9;

// New Tabs Definition
const FEED_TABS = ['精选', '最新', '随览', '附近', '远方'];

const App: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [activeCategory, setActiveCategory] = useState<Category>(Category.ALL);
  const [activeTab, setActiveTab] = useState<string>('最新');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // Admin Modes - Unified Manage Mode
  const [isManageMode, setIsManageMode] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<Photo | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  
  // Progressive Loading State
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Sorting & Location States
  const [shuffleTrigger, setShuffleTrigger] = useState(0); // Trigger to force re-shuffle
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const isDark = theme === 'dark';

  // Background Component based on Theme
  const Background = () => (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 transition-colors duration-700 ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
      {isDark ? (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/30 rounded-full blur-[100px] animate-blob mix-blend-screen" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-900/30 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-slate-200/50 to-transparent" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 brightness-100 contrast-100"></div>
        </>
      )}
    </div>
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Tab Click - Special logic for Random and Location
  const handleTabClick = (tab: string) => {
    // Reset view mode to grid when clicking other tabs, unless user toggles map explicitly
    if (viewMode === 'map') setViewMode('grid');

    if (tab === '随览') {
      // Always trigger re-shuffle even if already active
      setShuffleTrigger(prev => prev + 1);
    }
    
    // Only fetch location if clicking Nearby/Faraway and we don't have it yet
    if ((tab === '附近' || tab === '远方') && !userLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            // Location fetched successfully
          },
          (error) => {
            let msg = "无法获取您的地理位置。";
            if (error.code === error.PERMISSION_DENIED) msg = "您拒绝了位置权限，无法按距离排序。";
            else if (error.code === error.POSITION_UNAVAILABLE) msg = "位置信息不可用。";
            else if (error.code === error.TIMEOUT) msg = "获取位置超时。";
            
            console.warn("Geolocation error:", error.message);
            alert(msg);
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      } else {
        alert("您的浏览器不支持地理位置功能。");
      }
    }
    
    // Set active tab immediately
    setActiveTab(tab);
  };

  // Filter & Sort Logic
  const filteredPhotos = useMemo(() => {
    let result = photos.filter(p => {
      if (activeCategory === Category.ALL) return true;
      if (activeCategory === Category.HORIZONTAL) return (p.width || 0) >= (p.height || 0);
      if (activeCategory === Category.VERTICAL) return (p.height || 0) > (p.width || 0);
      return p.category === activeCategory;
    });

    switch (activeTab) {
      case '精选':
        // Filter for 4 or 5 stars, then sort by rating desc
        result = result.filter(p => (p.rating || 0) >= 4);
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
        
      case '最新':
        // Photos are stored [Newest, ..., Oldest] via handleUpdatePhoto logic
        // So we just return the order as is.
        break;
        
      case '随览':
        // Random shuffle - depends on shuffleTrigger to re-run on every click
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const trigger = shuffleTrigger; // Dependency
        result = [...result].sort(() => Math.random() - 0.5);
        break;
        
      case '附近':
      case '远方':
        if (userLocation) {
          result = result.sort((a, b) => {
            const distA = (a.exif.latitude && a.exif.longitude) 
              ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, a.exif.latitude, a.exif.longitude)
              : 99999; // Put photos without location at the end
            const distB = (b.exif.latitude && b.exif.longitude) 
              ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, b.exif.latitude, b.exif.longitude)
              : 99999;
            
            return activeTab === '附近' ? distA - distB : distB - distA;
          });
        }
        break;
        
      default:
        break;
    }

    return result;
  }, [photos, activeCategory, activeTab, shuffleTrigger, userLocation]);

  // Progressive Loading Logic
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    window.scrollTo(0,0);
  }, [activeCategory, activeTab, shuffleTrigger, viewMode]); // Reset when reshuffled or view changed

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredPhotos.length));
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeCategory, activeTab, shuffleTrigger, filteredPhotos.length]);

  useEffect(() => {
    if (viewMode === 'map') return; // Don't scroll load in map view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredPhotos.length));
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredPhotos.length, visibleCount, viewMode]); 

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);

  const handleUpdatePhoto = (updatedPhoto: Photo) => {
    setPhotos(prevPhotos => {
      const exists = prevPhotos.some(p => p.id === updatedPhoto.id);
      if (exists) {
        return prevPhotos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
      } else {
        return [updatedPhoto, ...prevPhotos]; // Prepend new photo to keep Latest first
      }
    });
    if (selectedPhoto?.id === updatedPhoto.id) {
      setSelectedPhoto(updatedPhoto);
    }
  };

  const handleDeletePhoto = (e: React.MouseEvent, photoId: string) => {
    // Critical: Stop propagation instantly
    e.stopPropagation();
    e.preventDefault();

    // Use setTimeout to ensure the UI has registered the click event 
    // before locking the thread with window.confirm
    setTimeout(() => {
      const isConfirmed = window.confirm('确定要永久删除这张照片吗？');
      if (isConfirmed) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        // If the deleted photo was selected, close modal
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(null);
        }
      }
    }, 10);
  };

  const handlePhotoClick = (photo: Photo) => {
    // If management mode is active, prevent opening the modal
    if (isManageMode) return;
    
    setSelectedPhoto(photo);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto) return;
    setSlideDirection('right');
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return;
    setSlideDirection('left');
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentIndex - 1]);
    }
  };

  const currentIndex = selectedPhoto ? filteredPhotos.findIndex(p => p.id === selectedPhoto.id) : -1;
  const hasNext = currentIndex < filteredPhotos.length - 1;
  const hasPrev = currentIndex > 0;

  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-white/60" : "text-black/60";
  
  return (
    <div className={`min-h-screen font-sans selection:bg-purple-500/30 ${textPrimary}`}>
      <Background />

      {/* Hero Section - Compact Branding (Hidden in Map View) */}
      {viewMode !== 'map' && (
        <header className="pt-12 pb-8 px-6 max-w-7xl mx-auto">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight mb-2 tracking-tight">
              LUMINA.
            </h1>
            <p className={`text-lg leading-relaxed max-w-lg font-serif ${textSecondary} mb-0`}>
              光与影的精选集，记录瞬间的永恒。
              <br />
              <span className="text-sm opacity-70">A curated collection of moments in light and shadow.</span>
            </p>
          </div>
        </header>
      )}

      {/* Unified Sticky Utility Bar */}
      <div className={`sticky top-0 z-40 border-b transition-all duration-300 backdrop-blur-xl
        ${isDark ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}
        ${scrolled ? 'shadow-lg shadow-black/5' : ''}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Text Tabs */}
          <div className="flex gap-6 overflow-x-auto no-scrollbar items-center">
             {FEED_TABS.map(tab => (
               <button
                 key={tab}
                 onClick={() => handleTabClick(tab)}
                 className={`text-base font-serif transition-all whitespace-nowrap relative py-1
                    ${activeTab === tab 
                      ? (isDark ? 'text-white font-bold' : 'text-black font-bold')
                      : (isDark ? 'text-white/40 hover:text-white/80' : 'text-black/40 hover:text-black/80')
                    }
                 `}
               >
                 {tab}
                 {activeTab === tab && (
                   <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
                 )}
               </button>
             ))}
             
             {/* Map Toggle (Globe Icon) */}
             <button
               onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
               className={`p-1 rounded-full transition-colors flex items-center justify-center
                 ${viewMode === 'map' 
                   ? (isDark ? 'text-white bg-white/10' : 'text-black bg-black/5') 
                   : (isDark ? 'text-white/30 hover:text-white/80' : 'text-black/30 hover:text-black/80')
                 }
               `}
               title={viewMode === 'map' ? "切换回网格" : "世界地图模式"}
             >
               <Globe size={18} />
             </button>
          </div>

          {/* Right: Filters, Theme, Admin (Compact) */}
          <div className="flex items-center justify-between md:justify-end gap-3 overflow-x-auto no-scrollbar">
            
            {/* Categories - Compact Pills */}
            <div className="flex items-center gap-1.5">
              {Object.values(Category).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all
                    ${activeCategory === cat 
                      ? (isDark ? 'bg-white text-black' : 'bg-black text-white') 
                      : (isDark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-black/50 hover:bg-black/5 hover:text-black')
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className={`w-px h-4 mx-2 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0
                ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}
              `}
            >
              {isDark ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {/* Admin / Login */}
            {isAdmin ? (
               <div className="flex items-center gap-1 flex-shrink-0">
                 {/* Toggle Management Mode */}
                 <button
                   onClick={() => {
                     // Disable map view if entering manage mode to avoid conflicts
                     if (!isManageMode && viewMode === 'map') setViewMode('grid');
                     setIsManageMode(!isManageMode);
                   }}
                   className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isManageMode ? 'bg-purple-500 text-white' : (isDark ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5')}`}
                   title="管理模式 (编辑/删除)"
                 >
                   <Pencil size={14} />
                 </button>
                 
                 {/* Upload */}
                 <button 
                  onClick={() => { setPhotoToEdit(null); setIsUploadOpen(true); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
                  title="上传图片"
                >
                  <Plus size={16} />
                </button>
               </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)} 
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0
                  ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}
                `}
              >
                <Settings size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`
        ${viewMode === 'map' 
          ? "w-full h-[calc(100vh-65px)] relative" // Full screen map mode
          : "px-2 md:px-6 py-8 max-w-7xl mx-auto min-h-[60vh]" // Normal grid mode
        }
      `}>
        
        {viewMode === 'map' ? (
           // MAP VIEW
           <div className="w-full h-full">
             <MapView photos={filteredPhotos} theme={theme} onPhotoClick={handlePhotoClick} />
           </div>
        ) : (
          // GRID VIEW
          <>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-2 md:gap-4 space-y-2 md:space-y-4">
              {visiblePhotos.map((photo) => (
                <div 
                  key={photo.id} 
                  className={`break-inside-avoid animate-fade-in relative group-container mb-2 z-0 hover:z-10 transition-all duration-300`}
                >
                  <GlassCard 
                    theme={theme}
                    flat={true}
                    square={true}
                    hoverEffect={!isManageMode} // Disable hover effect in manage mode to stabilize buttons
                    className={`group h-full relative ${isManageMode ? 'cursor-default' : 'cursor-zoom-in'}`} 
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <div className="relative overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt={photo.title} 
                        className={`w-full h-auto object-cover transform transition-transform duration-700 ${isManageMode ? '' : 'group-hover:scale-105'}`}
                        loading="lazy"
                      />
                      
                      {/* Minimal Overlay - Info on Hover (Only if not in manage mode) */}
                      {!isManageMode && (
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4`}>
                          <p className="text-white font-serif text-lg font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{photo.title}</p>
                          <p className="text-white/70 text-xs uppercase tracking-wider translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{photo.category}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                  
                  {/* Manage Mode Interaction Overlay */}
                  {isManageMode && (
                    <div className="absolute inset-0 z-[50] bg-black/20 backdrop-blur-[2px] border-2 border-dashed border-white/30 flex items-start justify-between p-2 pointer-events-auto">
                      {/* Top Left: Edit */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPhotoToEdit(photo);
                          setIsUploadOpen(true);
                        }}
                        className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>

                      {/* Top Right: Delete */}
                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(e, photo.id)}
                        className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Scroll Sentinel */}
            <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center pointer-events-none opacity-0">
              Loading...
            </div>

            {filteredPhotos.length === 0 && (
              <div className={`text-center py-20 ${textSecondary}`}>
                <p>该分类下暂无图片。</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer - Hidden in Map View */}
      {viewMode !== 'map' && (
        <footer className={`border-t py-12 text-center text-xs uppercase tracking-widest ${isDark ? 'border-white/5 text-white/20' : 'border-black/5 text-black/20'}`}>
          <p>Lumina Portfolio</p>
        </footer>
      )}

      {/* Full Screen Photo Modal */}
      <PhotoModal 
        photo={selectedPhoto} 
        onClose={() => setSelectedPhoto(null)} 
        onNext={handleNextPhoto} 
        onPrev={handlePrevPhoto} 
        hasNext={hasNext} 
        hasPrev={hasPrev} 
        theme={theme} 
        slideDirection={slideDirection}
        isAdmin={isAdmin}
        onUpdatePhoto={handleUpdatePhoto}
      />

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => { setIsUploadOpen(false); setPhotoToEdit(null); }} 
        onUpload={handleUpdatePhoto} 
        theme={theme}
        editingPhoto={photoToEdit}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => setIsAdmin(true)}
        theme={theme}
      />
    </div>
  );
};

export default App;
