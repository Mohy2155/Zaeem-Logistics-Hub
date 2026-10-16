import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Building2, CalendarDays, CalendarRange, ChevronLeft, ChevronRight,
  CircleAlert, CircleCheck, ClipboardPlus, Download, FileSpreadsheet, FileText, FlaskConical, Gauge,
  HandCoins, Inbox, Info, LayoutDashboard, LoaderCircle, LucideAngularModule, LucideIconData, Menu, Moon,
  PanelLeftClose, PanelLeftOpen, Plus, ReceiptText, RotateCcw, Search, ShoppingCart, Sun, Trash2,
  TriangleAlert, Truck, Users, Wallet, X,
} from 'lucide-angular';

// Only icons listed here ship in the bundle. Add new ones here rather than importing lucide elsewhere.
const ICONS = {
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  'arrow-up-down': ArrowUpDown,
  building: Building2,
  calendar: CalendarDays,
  'calendar-range': CalendarRange,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'clipboard-plus': ClipboardPlus,
  download: Download,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  flask: FlaskConical,
  gauge: Gauge,
  'hand-coins': HandCoins,
  inbox: Inbox,
  info: Info,
  'layout-dashboard': LayoutDashboard,
  loader: LoaderCircle,
  menu: Menu,
  moon: Moon,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  plus: Plus,
  receipt: ReceiptText,
  'rotate-ccw': RotateCcw,
  search: Search,
  cart: ShoppingCart,
  sun: Sun,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  truck: Truck,
  users: Users,
  wallet: Wallet,
  x: X,
} satisfies Record<string, LucideIconData>;

export type IconName = keyof typeof ICONS;

/**
 * SVG icon from the shared set. Decorative by default (hidden from assistive technology);
 * pass `label` when the icon itself carries meaning.
 */
@Component({
  selector: 'ui-icon',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-icon',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  template: `<lucide-icon [img]="data()" [size]="size()" [strokeWidth]="strokeWidth()" />`,
  styles: `
    :host { display: inline-flex; flex-shrink: 0; line-height: 0; }
    :host ::ng-deep svg { display: block; }
  `,
})
export class UiIcon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  readonly strokeWidth = input(2);
  readonly label = input<string>();

  protected readonly data = computed(() => ICONS[this.name()]);
}
