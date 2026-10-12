/**
 * Icon set.
 *
 * Every glyph is a 24×24 stroked drawing, sized and coloured by the caller.
 * They exist so the library can draw its own chrome — chevrons, a close
 * button, a check inside a checkbox — without every consumer having to choose
 * an icon package before a Select will render.
 *
 * ## How a colour is resolved
 *
 * In one order, always: an explicit `color` prop, then the colour inherited
 * from an enclosing `IconColorProvider`, then the icon's own fallback.
 * Coloured surfaces such as Button provide the foreground that reads against
 * them, so an icon dropped into one follows the theme without the caller
 * hardcoding a hex — which is what breaks the moment the theme inverts.
 *
 * ## Weight
 *
 * `strokeWidth` defaults to 2 rather than to the drawing's own 1.5. The set is
 * drawn at 24 and used at 14–20, and a hairline that reads correctly at full
 * size thins to nothing at two thirds of it. A few glyphs carry their own
 * weight because they sit beside something they have to match: the check and
 * the bar inside a checkbox, the grip on a drag handle.
 *
 * ## Mirroring
 *
 * A glyph whose *meaning* is a horizontal direction mirrors in a right-to-left
 * subtree — the two side chevrons, the outward arrow, the send plane. Yoga
 * moves a chevron to the other end of its row but cannot turn the glyph
 * around, so without this an RTL list row ends up with a right-pointing
 * chevron on its left edge, pointing back at the text.
 *
 * Everything else is drawn once and left alone. The vertical axis does not
 * mirror, and an icon that is merely asymmetric — a magnifier, a pencil, a
 * play triangle — means the same thing either way round; flipping it would
 * only be a wrong drawing.
 *
 * A mirroring icon always carries a transform, identity included. Dropping the
 * prop leaves the last matrix the view was given in place, so a glyph mirrored
 * once stays mirrored when the direction flips back — the arrows in an app
 * that can switch direction at runtime end up pointing at the text one toggle
 * in, and never recover.
 *
 * ## The four drawn by hand
 *
 * Google, Facebook and Apple carry their own palettes, and a brand mark
 * repainted to match a surface is no longer the mark. `BadgeCheckIcon` is
 * two-tone by design — a solid badge with a check punched through it in a
 * second colour — and `checkColor` is a public prop that a single-colour
 * outline could only ignore. All four are drawn here rather than mapped.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Svg, { G, Path, type SvgProps } from 'react-native-svg';
import { useDirection } from '@/hooks/use-direction';
import { AlertTriangle as HgAlert02Icon } from 'lucide-react-native';
import { ChevronDown as HgArrowDown01Icon } from 'lucide-react-native';
import { ArrowDown as HgArrowDown02Icon } from 'lucide-react-native';
import { ChevronLeft as HgArrowLeft01Icon } from 'lucide-react-native';
import { ChevronRight as HgArrowRight01Icon } from 'lucide-react-native';
import { ChevronUp as HgArrowUp01Icon } from 'lucide-react-native';
import { ArrowUp as HgArrowUp02Icon } from 'lucide-react-native';
import { ArrowUpRight as HgArrowUpRight01Icon } from 'lucide-react-native';
import { Paperclip as HgAttachment01Icon } from 'lucide-react-native';
import { AudioLines as HgAudioWave01Icon } from 'lucide-react-native';
import { Bookmark as HgBookmark01Icon } from 'lucide-react-native';
import { MessageCircle as HgBubbleChatIcon } from 'lucide-react-native';
import { Calendar as HgCalendar03Icon } from 'lucide-react-native';
import { Camera as HgCamera01Icon } from 'lucide-react-native';
import { X as HgCancel01Icon } from 'lucide-react-native';
import { ListChecks as HgCheckListIcon } from 'lucide-react-native';
import { CircleCheck as HgCheckmarkCircle01Icon } from 'lucide-react-native';
import { Circle as HgCircleIcon } from 'lucide-react-native';
import { Clock as HgClock01Icon } from 'lucide-react-native';
import { Code as HgCodeIcon } from 'lucide-react-native';
import { Compass as HgCompassIcon } from 'lucide-react-native';
import { Copy as HgCopy01Icon } from 'lucide-react-native';
import { CreditCard as HgCreditCardIcon } from 'lucide-react-native';
import { Crosshair as HgCrosshairIcon } from 'lucide-react-native';
import { Trash2 as HgDelete02Icon } from 'lucide-react-native';
import { Download as HgDownload01Icon } from 'lucide-react-native';
import { GripVertical as HgDragDropVerticalIcon } from 'lucide-react-native';
import { Eye as HgEyeIcon } from 'lucide-react-native';
import { Heart as HgFavouriteIcon } from 'lucide-react-native';
import { File as HgFile01Icon } from 'lucide-react-native';
import { Folder as HgFolder01Icon } from 'lucide-react-native';
import { FolderOpen as HgFolderOpenIcon } from 'lucide-react-native';
import { Maximize as HgFullScreenIcon } from 'lucide-react-native';
import { Globe as HgGlobeIcon } from 'lucide-react-native';
import { Heading as HgHeading01Icon } from 'lucide-react-native';
import { Image as HgImage01Icon } from 'lucide-react-native';
import { Info as HgInformationCircleIcon } from 'lucide-react-native';
import { Keyboard as HgKeyboardIcon } from 'lucide-react-native';
import { List as HgLeftToRightListBulletIcon } from 'lucide-react-native';
import { ListOrdered as HgLeftToRightListNumberIcon } from 'lucide-react-native';
import { Link as HgLink01Icon } from 'lucide-react-native';
import { Lock as HgLockIcon } from 'lucide-react-native';
import { Unlock as HgLockOpenIcon } from 'lucide-react-native';
import { Menu as HgMenu01Icon } from 'lucide-react-native';
import { Mic as HgMic01Icon } from 'lucide-react-native';
import { Minus as HgMinusSignIcon } from 'lucide-react-native';
import { Moon as HgMoonIcon } from 'lucide-react-native';
import { Ellipsis as HgMoreHorizontalIcon } from 'lucide-react-native';
import { Bell as HgNotification03Icon } from 'lucide-react-native';
import { Package as HgPackageIcon } from 'lucide-react-native';
import { Pause as HgPauseIcon } from 'lucide-react-native';
import { Pencil as HgPencilEdit01Icon } from 'lucide-react-native';
import { Play as HgPlayIcon } from 'lucide-react-native';
import { Plus as HgPlusSignIcon } from 'lucide-react-native';
import { SquarePlus as HgPlusSignSquareIcon } from 'lucide-react-native';
import { Quote as HgQuoteDownIcon } from 'lucide-react-native';
import { Receipt as HgReceiptIcon } from 'lucide-react-native';
import { RotateCcw as HgRefreshCcwIcon } from 'lucide-react-native';
import { RotateCw as HgRefreshCwIcon } from 'lucide-react-native';
import { Repeat as HgRepeatIcon } from 'lucide-react-native';
import { Search as HgSearch01Icon } from 'lucide-react-native';
import { Send as HgSent02Icon } from 'lucide-react-native';
import { Send as HgSentIcon } from 'lucide-react-native';
import { Share2 as HgShare08Icon } from 'lucide-react-native';
import { ShieldAlert as HgShieldAlertIcon } from 'lucide-react-native';
import { ShieldCheck as HgShieldCheckIcon } from 'lucide-react-native';
import { Sparkles as HgSparklesIcon } from 'lucide-react-native';
import { Star as HgStarIcon } from 'lucide-react-native';
import { Sun as HgSun03Icon } from 'lucide-react-native';
import { Book as HgBook02Icon } from 'lucide-react-native';
import { Bug as HgBug01Icon } from 'lucide-react-native';
import { Phone as HgCall02Icon } from 'lucide-react-native';
import { Headset as HgHeadsetIcon } from 'lucide-react-native';
import { CircleHelp as HgHelpCircleIcon } from 'lucide-react-native';
import { LifeBuoy as HgLifebuoyIcon } from 'lucide-react-native';
import { Mail as HgMail01Icon } from 'lucide-react-native';
import { Ticket as HgTicket01Icon } from 'lucide-react-native';
import { Bold as HgTextBoldIcon } from 'lucide-react-native';
import { Italic as HgTextItalicIcon } from 'lucide-react-native';
import { Check as HgTick02Icon } from 'lucide-react-native';
import { ChevronsUpDown as HgUnfoldMoreIcon } from 'lucide-react-native';

export interface IconProps extends SvgProps {
  /** Both dimensions — icons are always square. */
  size?: number;
  /** Overrides the inherited colour and the icon's own fallback. */
  color?: string;
  /** Line weight. Defaults to 2, or to the glyph's own where it has one. */
  strokeWidth?: number;
}

/**
 * The colour icons inherit when they are not given one explicitly.
 *
 * Coloured surfaces (Button, and anything else that paints its own
 * background) provide the foreground that reads against them, so an icon
 * dropped into one follows the theme without the caller hardcoding a hex —
 * which is what breaks the moment the theme inverts.
 */
const IconColorContext = createContext<string | undefined>(undefined);

export function IconColorProvider({
  color,
  children,
}: {
  color: string | undefined;
  children: ReactNode;
}) {
  return <IconColorContext.Provider value={color}>{children}</IconColorContext.Provider>;
}

/** The inherited icon colour, if a surface is providing one. */
export function useIconColor(): string | undefined {
  return useContext(IconColorContext);
}

/** Resolves an icon's colour: explicit prop, then inherited, then fallback. */
function useResolvedColor(explicit: string | undefined, fallback: string): string {
  const inherited = useIconColor();
  return explicit ?? inherited ?? fallback;
}

/**
 * Props for icons that must never be announced by a screen reader.
 *
 * Two sets, because the two platforms take the instruction differently.
 * `accessibilityElementsHidden` and `importantForAccessibility` are native
 * props: on web they reach the DOM `<svg>` untranslated, where React warns
 * about the casing of the second one and neither has any effect — so the glyph
 * stays in the accessibility tree inside every button and field that already
 * carries its own name, and every icon on the page logs an error while it does.
 * `aria-hidden` is what says it there.
 */
const decorative = (
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }
) as Record<string, unknown>;

/** The default line weight. See the note on weight above. */
const STROKE = 2;

interface IconDefaults {
  /** Both dimensions at the size this glyph is normally drawn. */
  size: number;
  /** The colour used when neither a prop nor a provider supplies one. */
  color: string;
  /** Overrides `STROKE` for a glyph that has to match something beside it. */
  strokeWidth?: number;
  /** Whether the glyph's meaning is a horizontal direction. */
  flip?: boolean;
  /** Whether the glyph is a toggle that can be solid. See `ToggleIconProps`. */
  fillable?: boolean;
}

/**
 * Builds one icon from a glyph and the defaults it is normally drawn with.
 *
 * A factory rather than seventy near-identical components: what varies between
 * them is data, and what does not — the colour order, the weight default, the
 * mirror, the fill toggle, the prop passthrough — is worth having in exactly
 * one place, where a fix reaches the whole set at once.
 */
function icon(Glyph: LucideIcon, defaults: IconDefaults) {
  function Icon({
    size = defaults.size,
    color,
    strokeWidth,
    filled,
    style,
    ...props
  }: ToggleIconProps) {
    const resolved = useResolvedColor(color, defaults.color);
    const rtl = useDirection() === 'rtl';

    const drawing = (
      <Glyph
        size={size}
        color={resolved}
        strokeWidth={strokeWidth ?? defaults.strokeWidth ?? STROKE}
        fill={defaults.fillable && filled ? resolved : 'none'}
        style={defaults.flip ? undefined : style}
        {...props}
      />
    );

    if (!defaults.flip) return drawing;

    /*
     * The mirror goes on a view around the glyph, not on the glyph.
     *
     * The drawing component takes a `style` prop and drops it: it destructures
     * `style` out of its props and never puts it back, and the interop layer
     * that would otherwise have carried it is a package this library does not
     * use. A transform handed to it is silently discarded, which is a chevron
     * that keeps pointing right in a right-to-left row — and a failure with
     * nothing to see, since every other prop on the same element does arrive.
     *
     * A plain view cannot lose it. It also puts the caller's own `style` back
     * on the outside, where it is applied rather than thrown away.
     */
    return (
      <View style={[{ transform: [{ scaleX: rtl ? -1 : 1 }] }, style]}>{drawing}</View>
    );
  }

  return Icon;
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                   */
/* -------------------------------------------------------------------------- */

export const ChevronUpIcon = icon(HgArrowUp01Icon, { size: 16, color: '#737373' });
export const ChevronDownIcon = icon(HgArrowDown01Icon, { size: 16, color: '#737373' });
export const ChevronLeftIcon = icon(HgArrowLeft01Icon, {
  size: 16,
  color: '#737373',
  flip: true,
});
export const ChevronRightIcon = icon(HgArrowRight01Icon, {
  size: 16,
  color: '#737373',
  flip: true,
});
export const ChevronsUpDownIcon = icon(HgUnfoldMoreIcon, { size: 16, color: '#737373' });
export const EllipsisIcon = icon(HgMoreHorizontalIcon, { size: 16, color: '#737373' });
export const MenuIcon = icon(HgMenu01Icon, { size: 20, color: '#737373' });
export const XIcon = icon(HgCancel01Icon, { size: 16, color: '#737373' });
export const SearchIcon = icon(HgSearch01Icon, { size: 16, color: '#737373' });
export const ArrowUpRightIcon = icon(HgArrowUpRight01Icon, {
  size: 20,
  color: '#fff',
  flip: true,
});
export const PlusIcon = icon(HgPlusSignIcon, { size: 16, color: '#737373' });
export const MinusIcon = icon(HgMinusSignIcon, { size: 14, color: '#fff', strokeWidth: 3 });
export const CheckIcon = icon(HgTick02Icon, { size: 14, color: '#fff', strokeWidth: 3 });
export const CircleIcon = icon(HgCircleIcon, { size: 16, color: '#737373', fillable: true });
export const GripVerticalIcon = icon(HgDragDropVerticalIcon, {
  size: 16,
  color: '#737373',
  strokeWidth: 2.5,
});
export const MaximizeIcon = icon(HgFullScreenIcon, { size: 16, color: '#737373' });

/* -------------------------------------------------------------------------- */
/* Status                                                                   */
/* -------------------------------------------------------------------------- */

export const InfoIcon = icon(HgInformationCircleIcon, { size: 20, color: 'currentColor' });
export const CheckCircleIcon = icon(HgCheckmarkCircle01Icon, {
  size: 20,
  color: 'currentColor',
});
export const AlertTriangleIcon = icon(HgAlert02Icon, { size: 20, color: 'currentColor' });
export const ShieldAlertIcon = icon(HgShieldAlertIcon, { size: 16, color: '#737373' });
export const ShieldCheckIcon = icon(HgShieldCheckIcon, { size: 16, color: '#737373' });
export const BellIcon = icon(HgNotification03Icon, { size: 16, color: '#737373' });

/* -------------------------------------------------------------------------- */
/* Time and place                                                           */
/* -------------------------------------------------------------------------- */

export const CalendarIcon = icon(HgCalendar03Icon, { size: 16, color: '#737373' });
export const ClockIcon = icon(HgClock01Icon, { size: 16, color: '#737373' });
export const GlobeIcon = icon(HgGlobeIcon, { size: 16, color: '#737373' });
export const CompassIcon = icon(HgCompassIcon, { size: 16, color: '#737373' });
export const CrosshairIcon = icon(HgCrosshairIcon, { size: 16, color: '#737373' });

/* -------------------------------------------------------------------------- */
/* Text and editing                                                         */
/* -------------------------------------------------------------------------- */

export const BoldIcon = icon(HgTextBoldIcon, { size: 16, color: '#737373' });
export const ItalicIcon = icon(HgTextItalicIcon, { size: 16, color: '#737373' });
export const HeadingIcon = icon(HgHeading01Icon, { size: 16, color: '#737373' });
export const ListIcon = icon(HgLeftToRightListBulletIcon, { size: 16, color: '#737373' });
export const ListOrderedIcon = icon(HgLeftToRightListNumberIcon, {
  size: 16,
  color: '#737373',
});
export const ListChecksIcon = icon(HgCheckListIcon, { size: 16, color: '#737373' });
export const QuoteIcon = icon(HgQuoteDownIcon, { size: 16, color: '#737373' });
export const CodeIcon = icon(HgCodeIcon, { size: 16, color: '#737373' });
export const PencilIcon = icon(HgPencilEdit01Icon, { size: 16, color: '#737373' });
export const KeyboardIcon = icon(HgKeyboardIcon, { size: 16, color: '#737373' });

/* -------------------------------------------------------------------------- */
/* Files and media                                                          */
/* -------------------------------------------------------------------------- */

export const FileIcon = icon(HgFile01Icon, { size: 16, color: '#737373' });
export const FolderIcon = icon(HgFolder01Icon, { size: 16, color: '#737373' });
export const FolderOpenIcon = icon(HgFolderOpenIcon, { size: 16, color: '#737373' });
export const ImageIcon = icon(HgImage01Icon, { size: 16, color: '#737373' });
export const PaperclipIcon = icon(HgAttachment01Icon, { size: 16, color: '#737373' });
export const CameraIcon = icon(HgCamera01Icon, { size: 16, color: '#737373' });
export const MicIcon = icon(HgMic01Icon, { size: 16, color: '#737373' });
export const AudioLinesIcon = icon(HgAudioWave01Icon, { size: 16, color: '#737373' });
export const PlayIcon = icon(HgPlayIcon, { size: 16, color: '#737373' });
export const PauseIcon = icon(HgPauseIcon, { size: 16, color: '#737373', strokeWidth: 1.5 });
export const DownloadIcon = icon(HgDownload01Icon, { size: 16, color: '#737373' });
export const PackageIcon = icon(HgPackageIcon, { size: 16, color: '#737373' });

/* -------------------------------------------------------------------------- */
/* Actions                                                                  */
/* -------------------------------------------------------------------------- */

export const CopyIcon = icon(HgCopy01Icon, { size: 16, color: '#737373' });
export const LinkIcon = icon(HgLink01Icon, { size: 16, color: '#737373' });
export const ShareNodesIcon = icon(HgShare08Icon, { size: 16, color: '#737373' });
export const SendIcon = icon(HgSentIcon, { size: 16, color: '#737373', flip: true });
export const SendArrowIcon = icon(HgSent02Icon, {
  size: 16,
  color: '#737373',
  strokeWidth: 2.5,
});
export const TrashIcon = icon(HgDelete02Icon, { size: 16, color: '#737373' });
export const RotateCcwIcon = icon(HgRefreshCcwIcon, { size: 16, color: '#737373' });
export const RotateCwIcon = icon(HgRefreshCwIcon, { size: 16, color: '#737373' });
export const RepeatIcon = icon(HgRepeatIcon, { size: 16, color: '#737373' });
export const PlusSquareIcon = icon(HgPlusSignSquareIcon, { size: 16, color: '#737373' });
export const EyeIcon = icon(HgEyeIcon, { size: 16, color: '#737373' });
export const LockIcon = icon(HgLockIcon, { size: 16, color: '#737373' });
export const UnlockIcon = icon(HgLockOpenIcon, { size: 16, color: '#737373' });

/* -------------------------------------------------------------------------- */
/* Marks and moods                                                          */
/* -------------------------------------------------------------------------- */

export const StarIcon = icon(HgStarIcon, {
  size: 20,
  color: '#737373',
  strokeWidth: 1.6,
  fillable: true,
});
export const HeartIcon = icon(HgFavouriteIcon, {
  size: 16,
  color: '#737373',
  fillable: true,
});
export const BookmarkIcon = icon(HgBookmark01Icon, {
  size: 16,
  color: '#737373',
  fillable: true,
});
export const SparklesIcon = icon(HgSparklesIcon, { size: 16, color: '#737373' });
export const MessageCircleIcon = icon(HgBubbleChatIcon, {
  size: 16,
  color: '#737373',
  fillable: true,
});
export const CardIcon = icon(HgCreditCardIcon, { size: 16, color: '#737373' });
export const HeadsetIcon = icon(HgHeadsetIcon, { size: 16, color: '#737373' });
export const LifebuoyIcon = icon(HgLifebuoyIcon, { size: 16, color: '#737373' });
export const HelpCircleIcon = icon(HgHelpCircleIcon, { size: 16, color: '#737373' });
export const MailIcon = icon(HgMail01Icon, { size: 16, color: '#737373' });
export const CallIcon = icon(HgCall02Icon, { size: 16, color: '#737373' });
export const BugIcon = icon(HgBug01Icon, { size: 16, color: '#737373' });
export const BookIcon = icon(HgBook02Icon, { size: 16, color: '#737373' });
export const TicketIcon = icon(HgTicket01Icon, { size: 16, color: '#737373' });
export const ReceiptIcon = icon(HgReceiptIcon, { size: 16, color: '#737373' });
export const SunIcon = icon(HgSun03Icon, { size: 18, color: '#f5f5f5' });
export const MoonIcon = icon(HgMoonIcon, { size: 18, color: '#262626' });

/* -------------------------------------------------------------------------- */
/* A post's toggles                                                         */
/* -------------------------------------------------------------------------- */

export const ArrowUpIcon = icon(HgArrowUp02Icon, {
  size: 16,
  color: '#737373',
  fillable: true,
});
export const ArrowDownIcon = icon(HgArrowDown02Icon, {
  size: 16,
  color: '#737373',
  fillable: true,
});

/* -------------------------------------------------------------------------- */
/* Drawn by hand                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The icons a post's action row is made of.
 *
 * These are the only ones in the set that take `filled`, and it is not a
 * stylistic choice: a like, a save and a vote are toggles, and the outline and
 * the solid are the two states of one control. Drawn as two different icons
 * they would swap shape under the finger; drawn as one that fills, the shape
 * stays put and only the inside changes.
 */
export interface ToggleIconProps extends IconProps {
  /** Solid rather than outlined — the on state of a like, a save, a vote. */
  filled?: boolean;
}

export interface BadgeCheckIconProps extends IconProps {
  /** The tick's colour when the rosette is solid. Defaults to white. */
  checkColor?: string;
}

/** Google "G", in the four official brand colours. */
export function GoogleIcon({ size = 18, ...props }: Omit<IconProps, 'color'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative} {...props}>
      <G>
        <Path
          fill="#4285F4"
          d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87"
        />
        <Path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.11A12 12 0 0 0 12 24"
        />
        <Path
          fill="#FBBC05"
          d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.29a12 12 0 0 0 0 10.76z"
        />
        <Path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.11C6.22 6.86 8.87 4.75 12 4.75"
        />
      </G>
    </Svg>
  );
}

/** Facebook "f" mark. */

/** Facebook "f" mark. */
export function FacebookIcon({ size = 18, ...props }: Omit<IconProps, 'color'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative} {...props}>
      <Path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07"
      />
    </Svg>
  );
}

/**
 * Apple mark. Monochrome by design, so unlike the other brand marks it does
 * follow the icon colour context — Apple's guidelines require it to match the
 * button's text colour.
 */

/**
 * Apple mark. Monochrome by design, so unlike the other brand marks it does
 * follow the icon colour context — Apple's guidelines require it to match the
 * button's text colour.
 */
export function AppleIcon({ size = 18, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#000000');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative} {...props}>
      <Path
        fill={resolved}
        d="M17.05 12.54c-.03-2.85 2.33-4.22 2.43-4.29-1.32-1.94-3.38-2.2-4.11-2.23-1.75-.18-3.42 1.03-4.31 1.03-.89 0-2.26-1.01-3.72-.98-1.91.03-3.68 1.11-4.66 2.82-1.99 3.45-.51 8.55 1.42 11.35.95 1.37 2.07 2.91 3.55 2.85 1.43-.06 1.97-.92 3.69-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.39 3.44-2.77 1.09-1.59 1.53-3.13 1.56-3.21-.03-.01-2.99-1.15-3.01-4.54M14.27 4.2c.79-.96 1.32-2.28 1.17-3.6-1.14.05-2.51.76-3.32 1.71-.73.85-1.37 2.2-1.2 3.5 1.27.1 2.57-.65 3.35-1.61"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Event icons (Timeline and other status surfaces)                           */
/* -------------------------------------------------------------------------- */

/**
 * The verified rosette.
 *
 * Solid by default, unlike everything else here. A verification mark is a
 * claim about the account rather than a control, and an outlined one next to
 * an outlined like button reads as another thing you could press.
 */
export function BadgeCheckIcon({
  size = 16,
  color,
  checkColor = '#ffffff',
  ...props
}: BadgeCheckIconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={resolved}
      />
      <Path
        d="m9 12 2 2 4-4"
        stroke={checkColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
