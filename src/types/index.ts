export type UserRole = 'admin' | 'employee' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string; // Primary company affiliation
  companyIds?: string[]; // Multiple company affiliations
  password?: string; // Only administrators have management logins
  assignedCardId?: string; // Direct smart card link
  status: 'active' | 'paused';
  phone?: string;
  designation?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl?: string;
  badgeText?: string;
  overlayPosition?: 'bottom' | 'top' | 'none';
  overlayStyle?: 'transparent' | 'light' | 'medium' | 'dark' | 'solid';
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  price?: string; // in ZAR or custom
  iconName?: string;
}

export interface SocialLinks {
  whatsapp?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string; // X
  tiktok?: string;
  youtube?: string;
  telegram?: string;
  bookingUrl?: string; // MS Teams, MS Outlook Bookings, or calendar link
}

export type BusinessCategory =
  | 'security'
  | 'restaurant'
  | 'retail'
  | 'trades'
  | 'medical'
  | 'beauty'
  | 'real_estate'
  | 'professional'
  | 'corporate'
  | 'executive'
  | 'freelance'
  | 'community'
  | 'custom';

export interface CardTheme {
  primaryColor: string; // brand accent
  secondaryColor?: string;
  bgType: 'gradient' | 'image' | 'dark' | 'glass' | 'none' | 'color';
  bgImageUrl?: string;
  headerImageUrl?: string;
  darkOverlayOpacity: number; // 0 to 100
  glassmorphism: boolean;
}

export type MediaType = 'image' | 'video' | 'youtube' | 'audio';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string; // Direct image, video (mp4/webm), YouTube URL, or audio URL (mp3/wav)
  title?: string;
  description?: string;
  thumbnailUrl?: string; // Optional custom thumbnail
  caption?: string;
}

export type CompanyStatus = 'active' | 'pending_approval' | 'inactive' | 'suspended';
export type ManagementMode = 'self_managed' | 'bsmart_managed';
export type BillingStatus = 'paid' | 'payment_due' | 'trial' | 'overdue';
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'custom';
export type BillingCycle = 'monthly' | 'annual';

export interface CompanyModules {
  cards: boolean;          // Smart Business Cards & NFC Tap
  teamDirectory: boolean;  // Multi-Employee Team Member Directory
  multimedia: boolean;     // Multimedia Showcase (Video, YouTube, Portfolios)
  leads: boolean;          // Inquiries & Callback Leads Manager
  analytics: boolean;      // Interaction Metrics & Click Tracking
  customBranding: boolean; // Custom Domains, Colors & Themes
}

export interface CompanySubscription {
  planId: SubscriptionTier;
  planName: string;
  billingCycle: BillingCycle;
  amountZAR: number;
  billingStatus: BillingStatus;
  nextBillingDate?: string;
  lastPaymentDate?: string;
  paymentMethod?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
  notes?: string;
}

export interface Company {
  id: string;
  name: string;
  tagline: string;
  category: BusinessCategory;
  categoryLabel: string;
  logoUrl: string;
  theme: CardTheme;
  aboutText?: string;
  operatingHours?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  multimedia?: MediaItem[];
  galleryImages?: string[];
  createdAt: string;
  updatedAt?: string;

  // Sign-Up, Governance & Module Access
  status?: CompanyStatus; // 'active' | 'pending_approval' | 'inactive' | 'suspended'
  managementMode?: ManagementMode; // 'self_managed' | 'bsmart_managed'
  modules?: CompanyModules;
  subscription?: CompanySubscription;

  // Registration & Contact
  contactPersonName?: string;
  contactEmail?: string;
  contactPhone?: string;
  registrationNotes?: string;
  approvedAt?: string;
  approvedBy?: string;

  // Automated Weekly / Monthly Reports Configuration
  reportFrequency?: 'both' | 'weekly' | 'monthly' | 'none';
  reportEmail?: string; // Optional override; defaults to main company email
  lastWeeklyReportSentAt?: string;
  lastMonthlyReportSentAt?: string;
}


export interface BusinessCard {
  id: string;
  companyId?: string; // Parent organization ID
  slug: string; // link name e.g. "beepd-communicator" or "zweli-security"
  businessName: string;
  tagline: string;
  businessType: BusinessCategory;
  businessTypeLabel: string;
  
  // Person details
  contactPersonName: string;
  designation: string; // Job title
  bio?: string; // Professional summary / bio
  
  // Media
  logoUrl: string;
  banners: BannerSlide[];
  theme: CardTheme;
  
  // Contact & Social
  socialLinks: SocialLinks;
  emergencyPhone?: string; // For security / medical cards
  
  // Sections
  aboutText: string;
  services: ServiceItem[];
  galleryImages: string[];
  multimedia?: MediaItem[];
  operatingHours: string;
  
  // Meta & Status
  status: 'live' | 'draft';
  assignedMemberId?: string;
  viewsCount: number;
  sharesCount: number;
  callClicksCount: number;
  whatsappClicksCount: number;
  vcardDownloadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 'new' | 'contacted' | 'in_progress' | 'resolved' | 'archived';

export interface LeadInquiry {
  id: string;
  cardId: string;
  cardName: string;
  companyId?: string;
  companyName?: string;
  cardHolderName?: string;
  cardHolderEmail?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  subject?: string; // e.g. "General Inquiry", "Quotation Request", "Callback Request", "Urgent Support"
  preferredContact?: 'whatsapp' | 'call' | 'email';
  preferredTime?: string; // e.g. "Morning (08:00 - 12:00)", "Afternoon (12:00 - 17:00)", "Immediate / Urgent", "Anytime"
  status: LeadStatus;
  notes?: string; // Internal admin follow-up notes & history
  followUpDate?: string; // Scheduled follow-up date (e.g. YYYY-MM-DD)
  lastContactedAt?: string;
  cardHolderNotifiedAt?: string;
  lastReminderSentAt?: string;
  escalationSentAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type EmailNotificationType =
  | 'new_enquiry_cardholder'
  | 'followup_scheduled_cardholder'
  | 'followup_due_cardholder'
  | 'unattended_sla_alert'
  | 'weekly_company_report'
  | 'monthly_company_report'
  | 'delivery_test'
  | 'smtp_test';

export interface EmailNotificationLog {
  id: string;
  companyId?: string;
  companyName?: string;
  leadId?: string;
  cardId?: string;
  cardHolderName?: string;
  cardHolderPhone?: string;
  recipientEmail: string;
  ccEmail?: string;
  emailType: EmailNotificationType;
  subject: string;
  status: 'sent' | 'active_in_app' | 'queued_smtp_unconfigured' | 'failed';
  deliveryMethod?: 'https_webhook' | 'https_resend' | 'https_brevo' | 'https_sendgrid' | 'local_sendmail' | 'smtp' | 'in_app_direct';
  messageId?: string;
  errorMessage?: string;
  textSummary?: string;
  htmlPreview?: string;
  createdAt: string;
  sentAt?: string;
}

export interface StarterTemplate {
  id: BusinessCategory;
  name: string;
  description: string;
  icon: string;
  tag: string;
  defaultData: Partial<BusinessCard>;
}
