import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Save,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Image,
  Upload,
  Layers,
  Palette,
  Eye,
  EyeOff,
  Maximize2,
  X,
  Info,
  AlertCircle,
  HelpCircle,
  Check,
  UserCheck,
  Building2,
  Clock,
  Film,
  Music,
  Play,
  Video,
  ExternalLink,
} from 'lucide-react';
import { BusinessCard, Company, StarterTemplate, User, BannerSlide, ServiceItem, MediaItem, MediaType } from '../types';
import { STARTER_TEMPLATES } from '../data/starterTemplates';
import { AvatarUploadField } from './AvatarUploadField';
import { ImageUploadOrUrlField } from './ImageUploadOrUrlField';
import { OperatingScheduleEditor } from './OperatingScheduleEditor';
import { detectMediaType, extractYouTubeId, getYouTubeEmbedUrl, normalizeMediaList } from '../utils/mediaUtils';
import { ensureUniqueSlug, isMasterTemplateCard, slugify } from '../utils/linking';

interface CardEditorProps {
  card?: BusinessCard | null;
  defaultCompany?: Company | null;
  companies?: Company[];
  members: User[];
  existingCards?: BusinessCard[];
  onSave: (card: BusinessCard) => void;
  onCancel: () => void;
}

const PRESET_BACKGROUNDS = [
  { name: 'Executive Obsidian Shimmer', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Gold Veined Black Marble', url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Carbon Slate Weave', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Imperial Emerald Waves', url: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Midnight Sapphire Aura', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Smart Circuit Tech', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Dark Tactical', url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Luxury Glass', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Warm Culinary', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Modern Architecture', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Healthcare Clean', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Boutique Leather', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80' },
];

const PRESET_COLORS = [
  '#d4af37', // 24K Luxury Gold
  '#e8927c', // Rose Gold
  '#10b981', // Sovereign Emerald
  '#0284c7', // B-Smart Electric Blue
  '#38bdf8', // Ice Cyan
  '#8b5cf6', // Royal Amethyst
  '#b91c1c', // Crimson Burgundy
  '#b45309', // Burnished Bronze
  '#cbd5e1', // Titanium Platinum
  '#f59e0b', // Solar Amber
  '#ef4444', // Red Alert
  '#14b8a6', // Deep Teal
];

export const CardEditor: React.FC<CardEditorProps> = ({
  card,
  defaultCompany,
  companies,
  members,
  existingCards = [],
  onSave,
  onCancel,
}) => {
  const isNew = !card;

  // Selected Starter Template state if creating new
  const [selectedTemplate, setSelectedTemplate] = useState<StarterTemplate | null>(null);
  const [hasPickedStarter, setHasPickedStarter] = useState(!isNew || !!defaultCompany);

  // Form state
  const [formData, setFormData] = useState<BusinessCard>(() => {
    if (card) {
      return {
        ...card,
        multimedia: Array.isArray(card.multimedia)
          ? normalizeMediaList(card.multimedia)
          : normalizeMediaList(undefined, card.galleryImages),
      };
    }
    if (defaultCompany) {
      const hasExistingCompanyCard = existingCards.some(
        (c) => c.companyId === defaultCompany.id
      );
      const baseSlug = slugify(
        hasExistingCompanyCard ? `${defaultCompany.name}-card` : defaultCompany.name,
        'card'
      );
      const uniqueSlug = ensureUniqueSlug(baseSlug, existingCards);
      const masterCandidateId = `card-${defaultCompany.id}-master`;
      const generatedId =
        !hasExistingCompanyCard && !existingCards.some((c) => c.id === masterCandidateId)
          ? masterCandidateId
          : typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `c${Date.now()}-0000-4000-8000-000000000000`.slice(0, 36);

      return {
        id: generatedId,
        companyId: defaultCompany.id,
        slug: uniqueSlug,
        businessName: defaultCompany.name,
        tagline: defaultCompany.tagline,
        businessType: defaultCompany.category,
        businessTypeLabel: defaultCompany.categoryLabel,
        contactPersonName: '',
        designation: '',
        logoUrl: defaultCompany.logoUrl,
        banners: [],
        theme: { ...defaultCompany.theme },
        socialLinks: {
          website: defaultCompany.website,
          phone: defaultCompany.phone,
          email: defaultCompany.email,
          address: defaultCompany.address,
        },
        aboutText: defaultCompany.aboutText || '',
        services: [],
        galleryImages: [],
        multimedia: defaultCompany.multimedia ? [...defaultCompany.multimedia] : [],
        operatingHours: defaultCompany.operatingHours || 'Mon - Fri: 08:00 - 17:00',
        status: 'live',
        viewsCount: 0,
        sharesCount: 0,
        callClicksCount: 0,
        whatsappClicksCount: 0,
        vcardDownloadsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}-0000-4000-8000-000000000000`.slice(0, 36),
      slug: '',
      businessName: '',
      tagline: '',
      businessType: 'security',
      businessTypeLabel: 'Security & Armed Response',
      contactPersonName: '',
      designation: '',
      logoUrl: '',
      banners: [],
      theme: {
        primaryColor: '#ef4444',
        secondaryColor: '#1e293b',
        bgType: 'image',
        bgImageUrl: PRESET_BACKGROUNDS[0].url,
        darkOverlayOpacity: 75,
        glassmorphism: true,
      },
      socialLinks: {},
      aboutText: '',
      services: [],
      galleryImages: [],
      multimedia: [],
      operatingHours: 'Mon - Fri: 08:00 - 17:00',
      status: 'live',
      viewsCount: 0,
      sharesCount: 0,
      callClicksCount: 0,
      whatsappClicksCount: 0,
      vcardDownloadsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [activeSection, setActiveSection] = useState<'details' | 'banners' | 'services' | 'multimedia' | 'theme' | 'social' | 'schedule'>('details');
  const [slugError, setSlugError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editorFullscreenBanner, setEditorFullscreenBanner] = useState<string | null>(null);
  const [previewOverlayHidden, setPreviewOverlayHidden] = useState<Record<number, boolean>>({});

  // Apply starter template
  const handleApplyStarter = (tmpl: StarterTemplate) => {
    setSelectedTemplate(tmpl);
    const def = tmpl.defaultData;
    const baseSlug = slugify(def.businessName || 'smart-card', 'smart-card');
    const uniqueSlug = ensureUniqueSlug(baseSlug, existingCards, formData.id);

    setFormData((prev) => ({
      ...prev,
      slug: uniqueSlug,
      businessName: def.businessName || '',
      tagline: def.tagline || '',
      businessType: def.businessType || tmpl.id,
      businessTypeLabel: def.businessTypeLabel || tmpl.name,
      contactPersonName: def.contactPersonName || '',
      designation: def.designation || '',
      emergencyPhone: def.emergencyPhone || '',
      logoUrl: def.logoUrl || '',
      aboutText: def.aboutText || '',
      operatingHours: def.operatingHours || 'Mon - Fri: 08:30 - 17:00',
      banners: def.banners ? [...def.banners] : [],
      services: def.services ? [...def.services] : [],
      theme: def.theme ? { ...prev.theme, ...def.theme } : prev.theme,
      socialLinks: def.socialLinks ? { ...def.socialLinks } : {},
    }));
    setHasPickedStarter(true);
  };

  const handleSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, slug: sanitized });
    if (!sanitized) {
      setSlugError('Link name is required and forms the web address.');
    } else if (
      existingCards.some(
        (c) => c.id !== formData.id && c.slug.toLowerCase().trim() === sanitized
      )
    ) {
      setSlugError('This slug is already used by another card — please pick a unique link name.');
    } else {
      setSlugError('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const sanitizedSlug = slugify(formData.slug, '');
    if (!sanitizedSlug) {
      setSlugError('Please specify a valid link name.');
      setActiveSection('details');
      return;
    }
    if (
      existingCards.some(
        (c) => c.id !== formData.id && c.slug.toLowerCase().trim() === sanitizedSlug
      )
    ) {
      setSlugError('This slug is already used by another card — please pick a unique link name.');
      setActiveSection('details');
      return;
    }
    if (!formData.businessName.trim()) {
      setFormError('Please provide a business name.');
      setActiveSection('details');
      return;
    }

    setIsSaving(true);
    try {
      const imagesOnly = (formData.multimedia || [])
        .filter((m) => m.type === 'image' && m.url && m.url.trim() !== '')
        .map((m) => m.url.trim());

      onSave({
        ...formData,
        slug: ensureUniqueSlug(sanitizedSlug, existingCards, formData.id),
        galleryImages: imagesOnly,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Multimedia helpers
  const handleAddMedia = (type: MediaType = 'youtube') => {
    const defaultUrls: Record<MediaType, string> = {
      youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    };

    const defaultTitles: Record<MediaType, string> = {
      youtube: 'Featured YouTube Video',
      video: 'Promotional Video Clip',
      image: 'Product & Office Showcase',
      audio: 'Audio Introduction & Message',
    };

    const newItem: MediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      url: defaultUrls[type] || '',
      title: defaultTitles[type] || '',
      description: '',
    };

    setFormData({
      ...formData,
      multimedia: [...(formData.multimedia || []), newItem],
    });
  };

  const handleUpdateMedia = (index: number, updates: Partial<MediaItem>) => {
    const list = [...(formData.multimedia || [])];
    if (!list[index]) return;

    if (updates.url && !updates.type) {
      const detected = detectMediaType(updates.url);
      updates.type = detected;
    }

    list[index] = { ...list[index], ...updates };
    setFormData({ ...formData, multimedia: list });
  };

  const handleRemoveMedia = (id: string) => {
    const itemToRemove = (formData.multimedia || []).find((m) => m.id === id);
    const updatedMultimedia = (formData.multimedia || []).filter((m) => m.id !== id);
    const updatedGallery = itemToRemove && itemToRemove.url
      ? (formData.galleryImages || []).filter((u) => u !== itemToRemove.url && u !== itemToRemove.url.trim())
      : (formData.galleryImages || []);

    setFormData({
      ...formData,
      multimedia: updatedMultimedia,
      galleryImages: updatedGallery,
    });
  };

  const handleMoveMedia = (index: number, direction: 'up' | 'down') => {
    const list = [...(formData.multimedia || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setFormData({ ...formData, multimedia: list });
  };

  // Banner slide helpers
  const handleAddBanner = () => {
    const newBanner: BannerSlide = {
      id: `b-${Date.now()}`,
      title: 'New Promotional Offer',
      subtitle: 'Highlight your top service or seasonal discount here',
      imageUrl: PRESET_BACKGROUNDS[0].url,
      badgeText: 'Featured',
    };
    setFormData({
      ...formData,
      banners: [...formData.banners, newBanner],
    });
  };

  const handleRemoveBanner = (id: string) => {
    setFormData({
      ...formData,
      banners: formData.banners.filter((b) => b.id !== id),
    });
  };

  // Service helpers
  const handleAddService = () => {
    const newService: ServiceItem = {
      id: `srv-${Date.now()}`,
      title: 'New Service or Product',
      description: 'Detail the features, delivery timeline, or warranty.',
      price: 'R499',
    };
    setFormData({
      ...formData,
      services: [...formData.services, newService],
    });
  };

  const handleRemoveService = (id: string) => {
    setFormData({
      ...formData,
      services: formData.services.filter((s) => s.id !== id),
    });
  };

  // If new card and starter hasn't been chosen yet:
  if (isNew && !hasPickedStarter) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Choose a Starter Template
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select an industry template to prefill colors, banners, promo copy, and services in 1 click.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {STARTER_TEMPLATES.map((tmpl, tmplIdx) => (
            <motion.div
              key={`tmpl-${tmpl.id}-${tmplIdx}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleApplyStarter(tmpl)}
              className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-bold">
                    {tmpl.tag}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{tmpl.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{tmpl.description}</p>
              </div>
              <button className="mt-4 w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1">
                <span>Select Starter</span>
                <Sparkles className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {isNew ? 'Create New b-Smart Card' : `Edit: ${formData.businessName || 'Card'}`}
            </h2>
            <p className="text-xs text-slate-400">
              Admin Control: Only administrators can publish and update card configurations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
          </motion.button>
        </div>
      </div>

      {/* Editor Sub-nav Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 mb-6 overflow-x-auto no-scrollbar text-xs font-semibold">
        <button
          onClick={() => setActiveSection('details')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'details' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          1. Business & Person
        </button>
        <button
          onClick={() => setActiveSection('banners')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'banners' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          2. Hero Banners ({formData.banners.length})
        </button>
        <button
          onClick={() => setActiveSection('services')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'services' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          3. Services & Pricing ({formData.services.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('multimedia')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSection === 'multimedia' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>4. Multimedia & Video ({(formData.multimedia || []).length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('theme')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'theme' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          5. Background & Brand
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('social')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'social' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          6. Contact & Socials
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('schedule')}
          className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSection === 'schedule' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>7. Operation Schedule</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {formError && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        {activeSection === 'details' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
              Card Identification & Ownership
            </h3>

            {/* Link name / Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Card Web Link Name (Slug) *
                </label>
                <span className="text-[11px] text-slate-500">
                  URL: yourdomain.co.za/card/<strong>{formData.slug || 'slug'}</strong>
                </span>
              </div>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="e.g. vanguard-security"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              {slugError ? (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {slugError}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  Only lowercase letters, numbers, and dashes. No spaces or special characters.
                </p>
              )}
            </div>

            {/* Status & Member Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Card Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'live' | 'draft' })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="live">🟢 Live & Published</option>
                  <option value="draft">🟡 Draft (Hidden from public)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign Card to Employee
                </label>
                {isMasterTemplateCard(formData) && (
                  <p className="text-[11px] text-amber-400 mb-1.5">
                    This is a Master Company Template. To keep branding reusable, use Issue Card or Bulk Allocate instead of assigning directly.
                  </p>
                )}
                <select
                  value={formData.assignedMemberId || ''}
                  onChange={(e) => {
                    const empId = e.target.value || undefined;
                    const emp = members.find((m) => m.id === empId);
                    setFormData({
                      ...formData,
                      assignedMemberId: empId,
                      contactPersonName: emp ? emp.name : formData.contactPersonName,
                      designation: emp?.designation || formData.designation,
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Unassigned / Company Master --</option>
                  {members.map((m, mIdx) => (
                    <option key={`m-${m.id}-${mIdx}`} value={m.id}>
                      {m.name} ({m.email}){m.assignedCardId && m.assignedCardId !== formData.id ? ' • has another card (will move)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Company Selection & Assignment */}
            {companies && companies.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Parent Company / Organization</span>
                  </label>
                  <span className="text-[10px] text-amber-500 font-semibold">Links card to company workspace</span>
                </div>
                <select
                  value={formData.companyId || ''}
                  onChange={(e) => {
                    const compId = e.target.value;
                    const comp = companies.find((c) => c.id === compId);
                    if (comp) {
                      setFormData((prev) => ({
                        ...prev,
                        companyId: comp.id,
                        businessName: prev.businessName || comp.name,
                        tagline: prev.tagline || comp.tagline,
                        businessType: comp.category,
                        businessTypeLabel: comp.categoryLabel,
                        logoUrl: prev.logoUrl || comp.logoUrl,
                        theme: {
                          ...prev.theme,
                          primaryColor: comp.theme?.primaryColor || prev.theme.primaryColor,
                        },
                      }));
                    } else {
                      setFormData((prev) => ({ ...prev, companyId: undefined }));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="">-- Standalone / General Organization --</option>
                  {companies.map((c, cIdx) => (
                    <option key={`c-${c.id}-${cIdx}`} value={c.id}>
                      {c.name} ({c.categoryLabel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Business info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. Vanguard Tactical Security"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Category Label
                </label>
                <input
                  type="text"
                  value={formData.businessTypeLabel}
                  onChange={(e) => setFormData({ ...formData, businessTypeLabel: e.target.value })}
                  placeholder="e.g. Armed Response & Surveillance"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Contact Person Name & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                  placeholder="e.g. Zweli Mkhize"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Managing Director"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Tagline & Emergency phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Company Tagline / Value Proposition
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Rapid 24/7 Armed Response & Tactical Perimeter Security"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Critical Contact Number (Optional - highlights priority contact bar)
              </label>
              <input
                type="tel"
                value={formData.emergencyPhone || ''}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                placeholder="e.g. +27 82 911 0000"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Bio summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                About Company / Bio Summary
              </label>
              <textarea
                rows={3}
                value={formData.aboutText}
                onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
                placeholder="Describe your capabilities, accreditations (PSIRA, PIRB), and coverage areas..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Company Brand Logo with real upload + link option */}
            <div className="pt-2">
              <ImageUploadOrUrlField
                value={formData.logoUrl}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                label="Company Brand / Logo Emblem"
                aspectRatio="square"
                helperText="Upload your company logo / emblem from device or paste an image link. (Square 1:1 ratio recommended)"
                placeholderUrl="https://example.com/logo.png"
              />
            </div>

            {/* Employee Allocation (System Admin Authorized Only) */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Allocate to Company Employee</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Admin Authorized
                </span>
              </label>
              <select
                value={formData.assignedMemberId || ''}
                onChange={(e) => {
                  const empId = e.target.value || undefined;
                  const emp = members.find((m) => m.id === empId);
                  setFormData({
                    ...formData,
                    assignedMemberId: empId,
                    contactPersonName: emp ? emp.name : formData.contactPersonName,
                    designation: emp?.designation || formData.designation,
                  });
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="">-- General / Unallocated (No specific employee) --</option>
                {members.map((m, mIdx) => (
                  <option key={`assign-m-${m.id}-${mIdx}`} value={m.id}>
                    {m.name} ({m.designation || m.email})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Allocates this business card to the chosen employee. When the employee logs into the portal, they will only see and share their allocated card.
              </p>
            </div>
          </div>
        )}

        {activeSection === 'banners' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                  Rotating Hero Banners
                </h3>
                <p className="text-xs text-slate-400">
                  Highlight specials, new releases, or critical contact services. Cross-fades automatically. Banners automatically fit to display full image with 300+ DPI quality.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBanner}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Banner</span>
              </button>
            </div>

            {formData.banners.map((banner, index) => (
              <div
                key={`editor-banner-${banner.id || index}-${index}`}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Banner #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBanner(banner.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Banner Headline
                    </label>
                    <input
                      type="text"
                      value={banner.title}
                      onChange={(e) => {
                        const updated = [...formData.banners];
                        updated[index].title = e.target.value;
                        setFormData({ ...formData, banners: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Badge Tag (e.g. Emergency, Special)
                    </label>
                    <input
                      type="text"
                      value={banner.badgeText || ''}
                      onChange={(e) => {
                        const updated = [...formData.banners];
                        updated[index].badgeText = e.target.value;
                        setFormData({ ...formData, banners: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Subtitle Description
                    </label>
                    <input
                      type="text"
                      value={banner.subtitle}
                      onChange={(e) => {
                        const updated = [...formData.banners];
                        updated[index].subtitle = e.target.value;
                        setFormData({ ...formData, banners: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-400">
                        Text Overlay Position
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...formData.banners];
                          const newPos = (banner.overlayPosition === 'none' ? 'bottom' : 'none');
                          updated[index].overlayPosition = newPos;
                          setFormData({ ...formData, banners: updated });
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                      >
                        {banner.overlayPosition === 'none' ? 'Enable Overlay' : 'Clean Graphic Only'}
                      </button>
                    </div>
                    <select
                      value={banner.overlayPosition || 'bottom'}
                      onChange={(e) => {
                        const updated = [...formData.banners];
                        updated[index].overlayPosition = e.target.value as 'bottom' | 'top' | 'none';
                        setFormData({ ...formData, banners: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-medium"
                    >
                      <option value="bottom">Bottom Overlay (Standard)</option>
                      <option value="top">Top Overlay</option>
                      <option value="none">Hide Text Overlay (Pure Clean Banner Graphic)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-400">
                        Text Overlay Transparency
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...formData.banners];
                          const isTrans = banner.overlayStyle === 'transparent';
                          updated[index].overlayStyle = isTrans ? 'dark' : 'transparent';
                          setFormData({ ...formData, banners: updated });
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                      >
                        {banner.overlayStyle === 'transparent' ? 'Add Glass Box' : 'Make 100% Transparent'}
                      </button>
                    </div>
                    <select
                      value={banner.overlayStyle || 'dark'}
                      onChange={(e) => {
                        const updated = [...formData.banners];
                        updated[index].overlayStyle = e.target.value as 'transparent' | 'light' | 'medium' | 'dark' | 'solid';
                        setFormData({ ...formData, banners: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-medium"
                    >
                      <option value="transparent">✨ 100% Transparent (Text Only, Floating)</option>
                      <option value="light">Light Glass Transparency (30% Dark Box)</option>
                      <option value="medium">Medium Glass Transparency (60% Dark Box)</option>
                      <option value="dark">Standard Dark Glass (85% Opacity - Default)</option>
                      <option value="solid">Solid Dark Box (100% Opaque)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <ImageUploadOrUrlField
                    label="Banner Visual Image (Full Auto-Fit · 300 DPI)"
                    aspectRatio="landscape"
                    value={banner.imageUrl}
                    onChange={(url) => {
                      const updated = [...formData.banners];
                      updated[index].imageUrl = url;
                      setFormData({ ...formData, banners: updated });
                    }}
                    helperText="Banner automatically fits to display full image with zero cropping. At least 300 DPI recommended for print & HD quality."
                    placeholderUrl="https://images.unsplash.com/..."
                  />

                  {/* Live Auto-Fit Banner Display Preview */}
                  {banner.imageUrl && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-2 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">Communicator Live Fit:</span>
                          <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                            <Sparkles className="w-3 h-3" /> Auto-Fit Full Image (Zero Crop · 300 DPI)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(banner.title || banner.subtitle || banner.badgeText) && banner.overlayPosition !== 'none' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewOverlayHidden(prev => ({
                                  ...prev,
                                  [index]: !prev[index],
                                }));
                              }}
                              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                              title={previewOverlayHidden[index] ? 'Show text overlay' : 'Hide text overlay (clean graphic view)'}
                            >
                              {previewOverlayHidden[index] ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3" />}
                              <span>{previewOverlayHidden[index] ? 'Show Text' : 'Hide Text'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditorFullscreenBanner(banner.imageUrl)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                            title="Inspect 300 DPI banner in full size"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>Full View</span>
                          </button>
                        </div>
                      </div>

                      {/* Spacious container with safe padding so image never touches borders or cuts off at top */}
                      <div className="relative w-full min-h-[220px] sm:min-h-[260px] max-h-[380px] aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-4 sm:p-5 pt-5 sm:pt-6 pb-4 sm:pb-5 flex items-center justify-center shadow-inner">
                        <img
                          src={banner.imageUrl || undefined}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-110 pointer-events-none"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                          }}
                        />
                        <img
                          src={banner.imageUrl || undefined}
                          alt="Banner Preview"
                          className="relative max-w-full max-h-full w-auto h-auto object-contain object-center z-10 drop-shadow-2xl select-none rounded-lg ring-1 ring-white/10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                          }}
                        />
                        {!previewOverlayHidden[index] && banner.overlayPosition !== 'none' && (banner.title || banner.subtitle || banner.badgeText) && (() => {
                          const isTrans = banner.overlayStyle === 'transparent';
                          const style = banner.overlayStyle || 'dark';
                          let bgClass = 'bg-slate-950/85 backdrop-blur-md border border-white/10 shadow-xl';
                          if (isTrans) {
                            bgClass = 'bg-transparent border border-transparent shadow-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]';
                          } else if (style === 'light') {
                            bgClass = 'bg-slate-950/30 backdrop-blur-sm border border-white/10 shadow-lg';
                          } else if (style === 'medium') {
                            bgClass = 'bg-slate-950/60 backdrop-blur-md border border-white/15 shadow-xl';
                          } else if (style === 'solid') {
                            bgClass = 'bg-slate-950 border border-slate-800 shadow-2xl';
                          }

                          return (
                            <div
                              className={`absolute left-3 right-3 sm:left-4 sm:right-16 text-left pointer-events-none z-20 ${
                                banner.overlayPosition === 'top'
                                  ? 'top-4 sm:top-5'
                                  : 'bottom-3 sm:bottom-4'
                              }`}
                            >
                              <div className={`inline-block max-w-full px-2.5 py-1.5 rounded-xl transition-all ${bgClass}`}>
                                {banner.badgeText && (
                                  <span className="inline-block px-1.5 py-0.2 text-[8px] uppercase font-bold rounded bg-amber-500 text-slate-950 mb-0.5 shadow-sm">
                                    {banner.badgeText}
                                  </span>
                                )}
                                {banner.title && (
                                  <p className={`text-[11px] font-bold text-white line-clamp-1 leading-tight ${isTrans ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' : ''}`}>
                                    {banner.title}
                                  </p>
                                )}
                                {banner.subtitle && (
                                  <p className={`text-[10px] text-slate-300 line-clamp-1 mt-0.5 ${isTrans ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] text-slate-100' : ''}`}>
                                    {banner.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'services' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                  Services & Pricing Catalogue
                </h3>
                <p className="text-xs text-slate-400">
                  List your core offerings, packages, and pricing in South African Rands (ZAR).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddService}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Service</span>
              </button>
            </div>

            {formData.services.map((srv, index) => (
              <div
                key={`editor-srv-${srv.id || index}-${index}`}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Service Item #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveService(srv.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Service Title
                    </label>
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => {
                        const updated = [...formData.services];
                        updated[index].title = e.target.value;
                        setFormData({ ...formData, services: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Price / Rate
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. R499/mo or Free"
                      value={srv.price || ''}
                      onChange={(e) => {
                        const updated = [...formData.services];
                        updated[index].price = e.target.value;
                        setFormData({ ...formData, services: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={srv.description}
                    onChange={(e) => {
                      const updated = [...formData.services];
                      updated[index].description = e.target.value;
                      setFormData({ ...formData, services: updated });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'multimedia' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>Multimedia Showcase & Video Hub</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Embed YouTube videos, MP4 video clips, MP3 audio podcasts, and showcase photos. YouTube videos play smoothly in-frame directly inside the digital card.
                </p>
              </div>

              {/* Quick Add Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddMedia('youtube')}
                  className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Add YouTube video link"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>+ YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMedia('video')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Add direct video clip (MP4 / WebM)"
                >
                  <Video className="w-3 h-3" />
                  <span>+ Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMedia('image')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Add photo or graphic"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>+ Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMedia('audio')}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Add audio track or voice note (MP3 / WAV)"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>+ Audio</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {(!formData.multimedia || formData.multimedia.length === 0) && (
              <div className="p-8 text-center rounded-xl bg-slate-950/70 border border-dashed border-slate-800 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Film className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Multimedia Items Added Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add YouTube video links, direct MP4 clips, or high-res gallery photos to engage visitors right on your card.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddMedia('youtube')}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Add First YouTube Video</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of media items */}
            {formData.multimedia && formData.multimedia.map((item, index) => {
              const isYouTube = item.type === 'youtube' || extractYouTubeId(item.url) !== null;
              const ytId = extractYouTubeId(item.url);

              return (
                <div
                  key={`media-editor-${item.id || index}-${index}`}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative group"
                >
                  {/* Item top bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        Item #{index + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.type === 'youtube'
                          ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                          : item.type === 'video'
                          ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                          : item.type === 'audio'
                          ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                          : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(index, 'up')}
                          className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400"
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      {index < (formData.multimedia || []).length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(index, 'down')}
                          className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400"
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        className="p-1 rounded text-red-400 hover:bg-red-950/40 ml-1 transition-colors cursor-pointer"
                        title="Delete media item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Type Selector Buttons */}
                  <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-semibold w-fit">
                    <button
                      type="button"
                      onClick={() => handleUpdateMedia(index, { type: 'youtube' })}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        item.type === 'youtube' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMedia(index, { type: 'video' })}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        item.type === 'video' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Video (MP4)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMedia(index, { type: 'image' })}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        item.type === 'image' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMedia(index, { type: 'audio' })}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        item.type === 'audio' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Audio
                    </button>
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {item.type === 'youtube'
                        ? 'YouTube Video Link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)'
                        : item.type === 'video'
                        ? 'Video URL (Direct MP4 / WebM file URL)'
                        : item.type === 'audio'
                        ? 'Audio File URL (MP3 / WAV / Podcast link)'
                        : 'Image URL or Upload'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => handleUpdateMedia(index, { url: e.target.value })}
                        placeholder={
                          item.type === 'youtube'
                            ? 'https://www.youtube.com/watch?v=...'
                            : item.type === 'video'
                            ? 'https://example.com/video.mp4'
                            : item.type === 'audio'
                            ? 'https://example.com/audio.mp3'
                            : 'https://images.unsplash.com/...'
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Image upload helper for photos */}
                  {item.type === 'image' && (
                    <div className="pt-1">
                      <ImageUploadOrUrlField
                        label="Or Upload High-Resolution Photo"
                        value={item.url}
                        onChange={(newUrl) => handleUpdateMedia(index, { url: newUrl })}
                        aspectRatio="landscape"
                      />
                    </div>
                  )}

                  {/* Title & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Title / Heading
                      </label>
                      <input
                        type="text"
                        value={item.title || ''}
                        onChange={(e) => handleUpdateMedia(index, { title: e.target.value })}
                        placeholder="e.g. Product Demonstration, Company Welcome"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Description / Caption (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleUpdateMedia(index, { description: e.target.value })}
                        placeholder="e.g. Watch our 2-minute corporate breakdown"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Live In-Editor Preview Box */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Live In-Frame Preview (How it appears on card)
                    </span>

                    {/* YouTube Preview */}
                    {item.type === 'youtube' && (
                      <div>
                        {ytId ? (
                          <div className="space-y-1.5">
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow">
                              <iframe
                                src={getYouTubeEmbedUrl(item.url)}
                                title={item.title || 'YouTube Preview'}
                                className="w-full h-full border-0 absolute inset-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              YouTube video verified. Plays in-frame right inside card without leaving.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                            Enter a valid YouTube URL above to preview the embedded player.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Direct Video Preview */}
                    {item.type === 'video' && (
                      <div>
                        {item.url ? (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                            <video src={item.url} controls className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                            Enter an MP4 video URL above to preview.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Audio Preview */}
                    {item.type === 'audio' && (
                      <div>
                        {item.url ? (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <audio src={item.url} controls className="w-full h-10 accent-amber-500" />
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                            Enter an audio URL above to preview.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Photo Preview */}
                    {item.type === 'image' && (
                      <div>
                        {item.url ? (
                          <div className="relative w-full aspect-video max-h-48 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                            <img src={item.url} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                            Paste an image URL or choose a photo above to preview.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeSection === 'theme' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
              Visual Appearance & Rich Image Background
            </h3>

            {/* Brand Color selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Primary Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((col, colIdx) => (
                    <button
                      key={`col-${col}-${colIdx}`}
                      type="button"
                      onClick={() => setFormData({ ...formData, theme: { ...formData.theme, primaryColor: col } })}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                      style={{
                        backgroundColor: col,
                        borderColor: formData.theme.primaryColor === col ? '#ffffff' : 'transparent',
                      }}
                    >
                      {formData.theme.primaryColor === col && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                  <input
                    type="color"
                    value={formData.theme.primaryColor}
                    onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, primaryColor: e.target.value } })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={formData.theme.primaryColor}
                    onChange={(e) => setFormData({ ...formData, theme: { ...formData.theme, primaryColor: e.target.value } })}
                    className="w-24 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>

            {/* Background Image / Upload / Link / Presets */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Wallpaper / Background Image</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      theme: {
                        ...formData.theme,
                        bgType: 'none',
                        bgImageUrl: '',
                      },
                    });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    (formData.theme.bgType === 'none' || formData.theme.bgImageUrl === '')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="Remove background wallpaper image completely and use clean dark gradient"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Remove Background Image</span>
                </button>
              </div>

              {formData.theme.bgType === 'none' || formData.theme.bgImageUrl === '' ? (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Image className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">No Background Image (Clean Dark Theme)</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    The rich background wallpaper image is removed. The card will display an executive deep neutral gradient.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        theme: {
                          ...formData.theme,
                          bgType: 'image',
                          bgImageUrl: PRESET_BACKGROUNDS[0].url,
                        },
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Wallpaper / Preset Image</span>
                  </button>
                </div>
              ) : (
                <ImageUploadOrUrlField
                  label="Card Background Image"
                  aspectRatio="portrait"
                  presets={PRESET_BACKGROUNDS}
                  value={formData.theme.bgImageUrl || ''}
                  onChange={(url) => setFormData({
                    ...formData,
                    theme: {
                      ...formData.theme,
                      bgType: url ? 'image' : 'none',
                      bgImageUrl: url,
                    },
                  })}
                  helperText="Upload your custom wallpaper/texture from device, choose a curated preset, or paste an image link (1080 × 1920 px 9:16 mobile portrait recommended)."
                  placeholderUrl="https://images.unsplash.com/..."
                />
              )}

              {/* Overlay Opacity Slider (shown when background image is present) */}
              {formData.theme.bgType !== 'none' && formData.theme.bgImageUrl !== '' && (
                <div className="pt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-300">Dark Contrast Overlay Opacity</span>
                    <span className="font-mono text-amber-400">{formData.theme.darkOverlayOpacity ?? 75}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="95"
                    value={formData.theme.darkOverlayOpacity ?? 75}
                    onChange={(e) => setFormData({
                      ...formData,
                      theme: { ...formData.theme, darkOverlayOpacity: Number(e.target.value) },
                    })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Darkens the background photo to make the white text and action icons instantly readable.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'social' && (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
              Direct Contact & Social Links
            </h3>
            <p className="text-xs text-slate-400">
              Add phone numbers with country code (+27 for South Africa) and social profiles.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number (Call Now)
                </label>
                <input
                  type="tel"
                  value={formData.socialLinks.phone || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, phone: e.target.value },
                  })}
                  placeholder="+27 11 555 0192"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Direct Number
                </label>
                <input
                  type="tel"
                  value={formData.socialLinks.whatsapp || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, whatsapp: e.target.value },
                  })}
                  placeholder="+27 82 911 0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.socialLinks.email || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, email: e.target.value },
                  })}
                  placeholder="contact@example.co.za"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={formData.socialLinks.website || ''}
                  onChange={(e) => {
                    let val = e.target.value;
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, website: val },
                    });
                  }}
                  placeholder="https://www.example.co.za"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Book Time / Meeting Link (MS Teams, MS Outlook Bookings, Calendar)
              </label>
              <input
                type="url"
                value={formData.socialLinks.bookingUrl || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, bookingUrl: e.target.value },
                })}
                placeholder="https://outlook.office365.com/book/... or https://teams.microsoft.com/..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Lets customers schedule meetings directly via MS Teams, MS Outlook Bookings, or your preferred booking calendar.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Physical Address / Premises
              </label>
              <input
                type="text"
                value={formData.socialLinks.address || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, address: e.target.value },
                })}
                placeholder="84 Sandton Drive, Sandhurst, Sandton, 2196"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instagram Profile Link
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.instagram || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, instagram: e.target.value },
                  })}
                  placeholder="https://instagram.com/yourhandle"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LinkedIn Page Link
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.linkedin || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, linkedin: e.target.value },
                  })}
                  placeholder="https://linkedin.com/company/yourhandle"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Facebook Page Link
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.facebook || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, facebook: e.target.value },
                  })}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  X (Twitter) Profile Link
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.twitter || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, twitter: e.target.value },
                  })}
                  placeholder="https://x.com/yourhandle"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'schedule' && (
          <OperatingScheduleEditor
            value={formData.operatingHours || ''}
            onChange={(val) => setFormData({ ...formData, operatingHours: val })}
            title="Card Operation Schedule & Trading Hours"
            subtitle="Configure standard business hours, weekend schedules, and 24/7 critical contact numbers displayed on this smart card."
          />
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-950/40"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Publishing...' : 'Save & Publish Card'}</span>
          </motion.button>
        </div>
      </form>

      {/* Fullscreen HD Banner Lightbox Modal in CardEditor */}
      {editorFullscreenBanner && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 animate-in fade-in duration-200"
          onClick={() => setEditorFullscreenBanner(null)}
        >
          <div
            className="flex items-center justify-between pb-3 border-b border-slate-800 max-w-5xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>300 DPI High-Resolution Banner Inspection (Zero Crop)</span>
            </div>
            <button
              onClick={() => setEditorFullscreenBanner(null)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-4 max-w-5xl w-full mx-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={editorFullscreenBanner || undefined}
              alt="Full Banner"
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10 select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
