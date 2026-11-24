import React, { useState } from 'react';
import {
  Play,
  Film,
  Image as ImageIcon,
  Music,
  Maximize2,
  X,
  Volume2,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MediaItem, MediaType } from '../types';
import { getYouTubeEmbedUrl, extractYouTubeId } from '../utils/mediaUtils';

interface MultimediaSectionProps {
  items: MediaItem[];
  brandColor?: string;
  isDark?: boolean;
  businessName?: string;
}

export const MultimediaSection: React.FC<MultimediaSectionProps> = ({
  items,
  brandColor = '#f59e0b',
  isDark = true,
  businessName = 'this card',
}) => {
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [previewImage, setPreviewImage] = useState<MediaItem | null>(null);

  // Group / filter items
  const videoItems = items.filter((it) => it.type === 'youtube' || it.type === 'video');
  const imageItems = items.filter((it) => it.type === 'image');
  const audioItems = items.filter((it) => it.type === 'audio');

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'video') return item.type === 'youtube' || item.type === 'video';
    if (filter === 'image') return item.type === 'image';
    if (filter === 'audio') return item.type === 'audio';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter Pills (if multiple media types exist) */}
      {items.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : isDark
                ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All ({items.length})</span>
          </button>

          {videoItems.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('video')}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                filter === 'video'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : isDark
                  ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Videos ({videoItems.length})</span>
            </button>
          )}

          {imageItems.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('image')}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                filter === 'image'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : isDark
                  ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Photos ({imageItems.length})</span>
            </button>
          )}

          {audioItems.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('audio')}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                filter === 'audio'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : isDark
                  ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>Audio ({audioItems.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className={`p-8 text-center rounded-2xl border ${
          isDark ? 'bg-slate-900/40 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Film className="w-6 h-6" />
          </div>
          <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            No Multimedia Items Found
          </h4>
          <p className="text-xs max-w-xs mx-auto">
            {filter === 'all'
              ? `No videos, audio tracks, or photos have been uploaded for ${businessName} yet.`
              : `No ${filter} items in this category.`}
          </p>
        </div>
      )}

      {/* Multimedia Feed / Grid */}
      <div className="space-y-4">
        {filteredItems.map((item, idx) => {
          // 1. YOUTUBE VIDEO PLAYER
          if (item.type === 'youtube') {
            const embedUrl = getYouTubeEmbedUrl(item.url);
            const isShorts = item.url.includes('/shorts/');
            return (
              <div
                key={item.id || `yt-${idx}`}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 shadow-xl'
                    : 'bg-white border-slate-200 shadow-md'
                }`}
              >
                {/* Video Header Info */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      YouTube
                    </span>
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.title || 'Featured Video'}
                    </h4>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Local In-Frame YouTube Player (Plays smoothly inside this exact card) */}
                <div className={`relative w-full overflow-hidden rounded-xl bg-black border border-slate-800 shadow-inner ${
                  isShorts ? 'aspect-[9/16] max-w-[320px] mx-auto' : 'aspect-video'
                }`}>
                  <iframe
                    src={embedUrl}
                    title={item.title || `${businessName} YouTube Video`}
                    className="w-full h-full border-0 absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>

                {/* Optional description / caption */}
                {item.description && (
                  <p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {item.description}
                  </p>
                )}
              </div>
            );
          }

          // 2. NATIVE VIDEO PLAYER (MP4 / WEBM / MOV)
          if (item.type === 'video') {
            return (
              <div
                key={item.id || `video-${idx}`}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 shadow-xl'
                    : 'bg-white border-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Film className="w-2.5 h-2.5" />
                      Video
                    </span>
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.title || 'Video Clip'}
                    </h4>
                  </div>
                </div>

                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                  <video
                    src={item.url}
                    controls
                    playsInline
                    preload="metadata"
                    poster={item.thumbnailUrl || undefined}
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>

                {item.description && (
                  <p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {item.description}
                  </p>
                )}
              </div>
            );
          }

          // 3. AUDIO PLAYER (MP3 / WAV / VOICE NOTES)
          if (item.type === 'audio') {
            return (
              <div
                key={item.id || `audio-${idx}`}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 shadow-xl'
                    : 'bg-white border-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Music className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[9px] font-bold uppercase">
                        Audio Track
                      </span>
                    </div>
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.title || 'Audio Recording'}
                    </h4>
                    {item.description && (
                      <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Audio Element with Native Player */}
                <div className="w-full rounded-xl p-1 bg-slate-950/60 border border-slate-800/80">
                  <audio
                    src={item.url}
                    controls
                    preload="metadata"
                    className="w-full h-10 accent-amber-500"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              </div>
            );
          }

          // 4. IMAGE / PHOTO
          return (
            <div
              key={item.id || `img-${idx}`}
              className={`group p-2.5 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
                  : 'bg-white border-slate-200 shadow-sm hover:shadow'
              }`}
            >
              <div
                onClick={() => setPreviewImage(item)}
                className="relative aspect-video sm:aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-950 cursor-pointer"
              >
                <img
                  src={item.url}
                  alt={item.title || 'Gallery showcase photo'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-white text-xs font-bold truncate drop-shadow">
                    {item.title || 'View Full Photo'}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {(item.title || item.description) && (
                <div className="pt-2 px-1">
                  {item.title && (
                    <h5 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.title}
                    </h5>
                  )}
                  {item.description && (
                    <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox / Zoom Modal for Images */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 max-h-[75vh] flex items-center justify-center shadow-2xl">
              <img
                src={previewImage.url}
                alt={previewImage.title || 'Photo preview'}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {(previewImage.title || previewImage.description) && (
              <div className="w-full mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                {previewImage.title && (
                  <h4 className="text-sm font-bold text-white mb-0.5">
                    {previewImage.title}
                  </h4>
                )}
                {previewImage.description && (
                  <p className="text-xs text-slate-400">
                    {previewImage.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
