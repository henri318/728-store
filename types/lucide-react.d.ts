declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';

  export type Icon = FC<SVGProps<SVGSVGElement> & { size?: number | string }>;

  // Commonly used icons — add more as needed
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const ChevronDown: Icon;
  export const ChevronUp: Icon;
  export const X: Icon;
  export const Menu: Icon;
  export const Search: Icon;
  export const ShoppingCart: Icon;
  export const User: Icon;
  export const LogOut: Icon;
  export const Trash2: Icon;
  export const Plus: Icon;
  export const Minus: Icon;
  export const Check: Icon;
  export const AlertCircle: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
}
