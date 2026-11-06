import type { ComponentType, SVGAttributes } from "react";
import {
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowsDownUp as PhArrowsDownUp,
  Bell as PhBell,
  Briefcase as PhBriefcase,
  CalendarBlank as PhCalendarBlank,
  CalendarDots as PhCalendarDots,
  CalendarPlus as PhCalendarPlus,
  Camera as PhCamera,
  CaretDown as PhCaretDown,
  CaretRight as PhCaretRight,
  ChartBar as PhChartBar,
  ChartPie as PhChartPie,
  ChatCircleDots as PhChatCircleDots,
  CheckCircle as PhCheckCircle,
  CircleNotch as PhCircleNotch,
  Clipboard as PhClipboard,
  ClipboardText as PhClipboardText,
  DeviceMobile as PhDeviceMobile,
  DotsThreeVertical as PhDotsThreeVertical,
  Drop as PhDrop,
  Envelope as PhEnvelope,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  FileText as PhFileText,
  FileX as PhFileX,
  FileXls as PhFileXls,
  Funnel as PhFunnel,
  Gear as PhGear,
  Globe as PhGlobe,
  GraduationCap as PhGraduationCap,
  Heart as PhHeart,
  Heartbeat as PhHeartbeat,
  House as PhHouse,
  Info as PhInfo,
  List as PhList,
  Lock as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  MapPin as PhMapPin,
  MapPinArea as PhMapPinArea,
  Megaphone as PhMegaphone,
  Money as PhMoney,
  Note as PhNote,
  Package as PhPackage,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Paperclip as PhPaperclip,
  PencilSimple as PhPencilSimple,
  Phone as PhPhone,
  Pill as PhPill,
  Plus as PhPlus,
  Printer as PhPrinter,
  Pulse as PhPulse,
  Receipt as PhReceipt,
  Ruler as PhRuler,
  Scales as PhScales,
  Shield as PhShield,
  ShieldCheck as PhShieldCheck,
  SignOut as PhSignOut,
  SquaresFour as PhSquaresFour,
  Stethoscope as PhStethoscope,
  Sun as PhSun,
  Trash as PhTrash,
  TrendDown as PhTrendDown,
  TrendUp as PhTrendUp,
  Trophy as PhTrophy,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserCircle as PhUserCircle,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  UsersThree as PhUsersThree,
  Wallet as PhWallet,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  X as PhX,
} from "@phosphor-icons/react/ssr";

// Icon set for the whole app. Components keep importing the familiar names
// from here; each one renders a Phosphor "duotone" glyph (two-tone, softer
// and rounder than the previous outline set) in the current text colour.
// Sizes still come from the Tailwind h-*/w-* classes on the icon.
export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "ref"> {
  className?: string;
  /** Accepted for API compatibility with the previous icon set; unused. */
  strokeWidth?: number;
}
export type LucideIcon = ComponentType<IconProps>;
export type AppIcon = LucideIcon;

type PhIcon = ComponentType<Record<string, unknown>>;

function make(Icon: PhIcon, name: string): LucideIcon {
  function AppIconComponent({ strokeWidth: _strokeWidth, ...props }: IconProps) {
    return <Icon weight="duotone" aria-hidden="true" {...props} />;
  }
  AppIconComponent.displayName = name;
  return AppIconComponent;
}

export const Activity = make(PhPulse as PhIcon, "Activity");
export const AlertCircle = make(PhWarningCircle as PhIcon, "AlertCircle");
export const AlertTriangle = make(PhWarning as PhIcon, "AlertTriangle");
export const ArrowLeft = make(PhArrowLeft as PhIcon, "ArrowLeft");
export const ArrowRight = make(PhArrowRight as PhIcon, "ArrowRight");
export const ArrowUpDown = make(PhArrowsDownUp as PhIcon, "ArrowUpDown");
export const Banknote = make(PhMoney as PhIcon, "Banknote");
export const BarChart3 = make(PhChartBar as PhIcon, "BarChart3");
export const Bell = make(PhBell as PhIcon, "Bell");
export const Briefcase = make(PhBriefcase as PhIcon, "Briefcase");
export const CalendarClock = make(PhCalendarDots as PhIcon, "CalendarClock");
export const CalendarDays = make(PhCalendarBlank as PhIcon, "CalendarDays");
export const CalendarPlus = make(PhCalendarPlus as PhIcon, "CalendarPlus");
export const Camera = make(PhCamera as PhIcon, "Camera");
export const CheckCircle2 = make(PhCheckCircle as PhIcon, "CheckCircle2");
export const ChevronDown = make(PhCaretDown as PhIcon, "ChevronDown");
export const ChevronRight = make(PhCaretRight as PhIcon, "ChevronRight");
export const ClipboardCheck = make(PhClipboardText as PhIcon, "ClipboardCheck");
export const ClipboardList = make(PhClipboardText as PhIcon, "ClipboardList");
export const ClipboardPlus = make(PhClipboard as PhIcon, "ClipboardPlus");
export const Droplet = make(PhDrop as PhIcon, "Droplet");
export const Eye = make(PhEye as PhIcon, "Eye");
export const EyeOff = make(PhEyeSlash as PhIcon, "EyeOff");
export const FileSpreadsheet = make(PhFileXls as PhIcon, "FileSpreadsheet");
export const FileText = make(PhFileText as PhIcon, "FileText");
export const FileWarning = make(PhFileX as PhIcon, "FileWarning");
export const Filter = make(PhFunnel as PhIcon, "Filter");
export const Globe = make(PhGlobe as PhIcon, "Globe");
export const GraduationCap = make(PhGraduationCap as PhIcon, "GraduationCap");
export const Heart = make(PhHeart as PhIcon, "Heart");
export const HeartPulse = make(PhHeartbeat as PhIcon, "HeartPulse");
export const Home = make(PhHouse as PhIcon, "Home");
export const Info = make(PhInfo as PhIcon, "Info");
export const LayoutDashboard = make(PhSquaresFour as PhIcon, "LayoutDashboard");
export const Loader2 = make(PhCircleNotch as PhIcon, "Loader2");
export const Lock = make(PhLock as PhIcon, "Lock");
export const LogOut = make(PhSignOut as PhIcon, "LogOut");
export const Mail = make(PhEnvelope as PhIcon, "Mail");
export const MapPin = make(PhMapPin as PhIcon, "MapPin");
export const MapPinned = make(PhMapPinArea as PhIcon, "MapPinned");
export const Megaphone = make(PhMegaphone as PhIcon, "Megaphone");
export const Menu = make(PhList as PhIcon, "Menu");
export const MessageSquareWarning = make(PhChatCircleDots as PhIcon, "MessageSquareWarning");
export const MoreVertical = make(PhDotsThreeVertical as PhIcon, "MoreVertical");
export const Package = make(PhPackage as PhIcon, "Package");
export const Paperclip = make(PhPaperclip as PhIcon, "Paperclip");
export const Pencil = make(PhPencilSimple as PhIcon, "Pencil");
export const Phone = make(PhPhone as PhIcon, "Phone");
export const PieChart = make(PhChartPie as PhIcon, "PieChart");
export const Pill = make(PhPill as PhIcon, "Pill");
export const Plus = make(PhPlus as PhIcon, "Plus");
export const Printer = make(PhPrinter as PhIcon, "Printer");
export const Receipt = make(PhReceipt as PhIcon, "Receipt");
export const RotateCcw = make(PhArrowCounterClockwise as PhIcon, "RotateCcw");
export const Ruler = make(PhRuler as PhIcon, "Ruler");
export const Search = make(PhMagnifyingGlass as PhIcon, "Search");
export const Send = make(PhPaperPlaneTilt as PhIcon, "Send");
export const Settings = make(PhGear as PhIcon, "Settings");
export const Shield = make(PhShield as PhIcon, "Shield");
export const ShieldCheck = make(PhShieldCheck as PhIcon, "ShieldCheck");
export const Smartphone = make(PhDeviceMobile as PhIcon, "Smartphone");
export const Stethoscope = make(PhStethoscope as PhIcon, "Stethoscope");
export const StickyNote = make(PhNote as PhIcon, "StickyNote");
export const Sun = make(PhSun as PhIcon, "Sun");
export const Trash2 = make(PhTrash as PhIcon, "Trash2");
export const TrendingDown = make(PhTrendDown as PhIcon, "TrendingDown");
export const TrendingUp = make(PhTrendUp as PhIcon, "TrendingUp");
export const Trophy = make(PhTrophy as PhIcon, "Trophy");
export const Upload = make(PhUploadSimple as PhIcon, "Upload");
export const User = make(PhUser as PhIcon, "User");
export const UserCheck = make(PhUserCheck as PhIcon, "UserCheck");
export const UserPlus = make(PhUserPlus as PhIcon, "UserPlus");
export const UserRound = make(PhUserCircle as PhIcon, "UserRound");
export const Users = make(PhUsers as PhIcon, "Users");
export const Users2 = make(PhUsersThree as PhIcon, "Users2");
export const Wallet = make(PhWallet as PhIcon, "Wallet");
export const Weight = make(PhScales as PhIcon, "Weight");
export const X = make(PhX as PhIcon, "X");
