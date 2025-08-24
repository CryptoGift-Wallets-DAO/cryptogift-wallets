/**
 * Focus Manager for WCAG 2.2 Compliance
 * Handles focus trapping, restoration, and visibility
 */

/**
 * Focus trap options
 */
export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string;
  returnFocus?: boolean;
  escapeDeactivates?: boolean;
  allowOutsideClick?: boolean;
}

/**
 * Focus Manager class
 */
export class FocusManager {
  private trapStack: HTMLElement[] = [];
  private previousFocus: HTMLElement | null = null;
  
  /**
   * Trap focus within an element
   */
  trapFocus(element: HTMLElement, options: FocusTrapOptions = {}): () => void {
    const {
      initialFocus,
      returnFocus = true,
      escapeDeactivates = true,
      allowOutsideClick = false,
    } = options;
    
    // Store previous focus
    if (returnFocus) {
      this.previousFocus = document.activeElement as HTMLElement;
    }
    
    // Add to trap stack
    this.trapStack.push(element);
    
    // Get focusable elements
    const focusableElements = this.getFocusableElements(element);
    
    if (focusableElements.length === 0) {
      console.warn('[A11y] No focusable elements found in trap');
      return () => this.releaseFocus(element);
    }
    
    // Set initial focus
    if (initialFocus) {
      const target = typeof initialFocus === 'string'
        ? element.querySelector<HTMLElement>(initialFocus)
        : initialFocus;
      
      if (target) {
        target.focus();
      } else {
        focusableElements[0].focus();
      }
    } else {
      focusableElements[0].focus();
    }
    
    // Handle tab key
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && escapeDeactivates) {
        this.releaseFocus(element);
      }
    };
    
    // Handle outside click
    const handleClick = (event: MouseEvent) => {
      if (!allowOutsideClick && !element.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        focusableElements[0].focus();
      }
    };
    
    // Add listeners
    element.addEventListener('keydown', handleTab);
    element.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClick, true);
    
    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleTab);
      element.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClick, true);
      this.releaseFocus(element);
    };
  }
  
  /**
   * Release focus trap
   */
  private releaseFocus(element: HTMLElement) {
    const index = this.trapStack.indexOf(element);
    if (index > -1) {
      this.trapStack.splice(index, 1);
    }
    
    // Restore previous focus
    if (this.previousFocus && this.trapStack.length === 0) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }
  
  /**
   * Get focusable elements within container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    
    const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
    
    // Filter visible elements
    return elements.filter(el => {
      return !this.isHidden(el) && !this.isObscured(el);
    });
  }
  
  /**
   * Check if element is hidden
   */
  private isHidden(element: HTMLElement): boolean {
    if (element.offsetParent === null) return true;
    
    const style = window.getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden';
  }
  
  /**
   * Check if element is obscured (WCAG 2.2 - 2.4.11)
   */
  private isObscured(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const elementAtPoint = document.elementFromPoint(centerX, centerY);
    return elementAtPoint !== element && !element.contains(elementAtPoint);
  }
  
  /**
   * Ensure element is not obscured when focused (WCAG 2.2 - 2.4.11)
   */
  ensureFocusVisible(element: HTMLElement): void {
    // Add scroll margin to prevent obscuring by fixed headers
    element.style.scrollMarginTop = '100px';
    element.style.scrollMarginBottom = '100px';
    
    // Scroll into view if needed
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
  
  /**
   * Apply focus indicator styles (WCAG 2.2 - 2.4.13)
   */
  applyFocusIndicator(element: HTMLElement): void {
    // Ensure minimum 2px solid border with 3:1 contrast
    element.style.outline = '2px solid #0052ff';
    element.style.outlineOffset = '2px';
    
    // Add focus-visible for keyboard-only focus
    element.classList.add('focus-visible');
  }
  
  /**
   * Create skip link
   */
  createSkipLink(targetId: string, text = 'Skip to main content'): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = `#${targetId}`;
    link.textContent = text;
    link.className = 'skip-link';
    
    // Style for visibility only on focus
    link.style.position = 'absolute';
    link.style.left = '-10000px';
    link.style.top = 'auto';
    link.style.width = '1px';
    link.style.height = '1px';
    link.style.overflow = 'hidden';
    
    // Show on focus
    link.addEventListener('focus', () => {
      link.style.position = 'fixed';
      link.style.top = '10px';
      link.style.left = '10px';
      link.style.width = 'auto';
      link.style.height = 'auto';
      link.style.padding = '8px 16px';
      link.style.backgroundColor = '#0052ff';
      link.style.color = 'white';
      link.style.textDecoration = 'none';
      link.style.borderRadius = '4px';
      link.style.zIndex = '10000';
    });
    
    // Hide on blur
    link.addEventListener('blur', () => {
      link.style.position = 'absolute';
      link.style.left = '-10000px';
      link.style.width = '1px';
      link.style.height = '1px';
    });
    
    return link;
  }
}

// Singleton instance
let manager: FocusManager | null = null;

/**
 * Get focus manager instance
 */
export function getFocusManager(): FocusManager {
  if (!manager) {
    manager = new FocusManager();
  }
  return manager;
}