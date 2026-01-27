import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromoValidationResult {
  valid: boolean;
  message: string;
  discountDescription?: string;
  promoId?: string;
  code?: string;
  percentOff?: number | null;
  amountOff?: number | null;
  trialDays?: number | null;
}

interface UsePromoCodeValidationOptions {
  debounceMs?: number;
  autoValidate?: boolean;
}

/**
 * Unified hook for promo code validation across the platform.
 * Single source of truth for all promo code logic.
 * 
 * @param initialCode - Initial promo code (e.g., from URL params)
 * @param options - Configuration options
 * @returns Promo code state and validation utilities
 */
export const usePromoCodeValidation = (
  initialCode: string = '',
  options: UsePromoCodeValidationOptions = {}
) => {
  const { debounceMs = 500, autoValidate = true } = options;
  
  const [promoCode, setPromoCode] = useState(initialCode.toUpperCase());
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<PromoValidationResult | null>(null);
  
  // Track the validated code separately for Stripe checkout
  const [validatedCode, setValidatedCode] = useState<string | null>(null);

  /**
   * Core validation function - calls the edge function
   */
  const validateCode = useCallback(async (code: string): Promise<PromoValidationResult | null> => {
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      setValidation(null);
      setValidatedCode(null);
      return null;
    }
    
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode: trimmedCode }
      });
      
      if (error) throw error;
      
      const result: PromoValidationResult = {
        valid: data.valid,
        message: data.message,
        discountDescription: data.discountDescription,
        promoId: data.promoId,
        code: data.code,
        percentOff: data.percentOff,
        amountOff: data.amountOff,
        trialDays: data.trialDays,
      };
      
      setValidation(result);
      
      // Store validated code for Stripe checkout
      if (result.valid) {
        setValidatedCode(trimmedCode);
      } else {
        setValidatedCode(null);
      }
      
      return result;
    } catch (error) {
      const errorResult: PromoValidationResult = {
        valid: false,
        message: 'Failed to validate promo code'
      };
      setValidation(errorResult);
      setValidatedCode(null);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Update promo code with automatic uppercase conversion
   */
  const updatePromoCode = useCallback((code: string) => {
    setPromoCode(code.toUpperCase());
  }, []);

  /**
   * Clear promo code and validation state
   */
  const clearPromoCode = useCallback(() => {
    setPromoCode('');
    setValidation(null);
    setValidatedCode(null);
  }, []);

  /**
   * Get the pricing URL with validated promo code as query param
   */
  const getPricingUrl = useCallback((basePath: string = '/pricing'): string => {
    if (validatedCode) {
      return `${basePath}?promo=${encodeURIComponent(validatedCode)}`;
    }
    return basePath;
  }, [validatedCode]);

  // Auto-validate with debounce when code changes
  useEffect(() => {
    if (!autoValidate) return;
    
    const timer = setTimeout(() => {
      if (promoCode.trim()) {
        validateCode(promoCode);
      } else {
        setValidation(null);
        setValidatedCode(null);
      }
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [promoCode, debounceMs, autoValidate, validateCode]);

  // Sync with initial code changes (e.g., URL param updates)
  useEffect(() => {
    if (initialCode && initialCode.toUpperCase() !== promoCode) {
      setPromoCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  return {
    // State
    promoCode,
    isValidating,
    validation,
    validatedCode,
    
    // Computed
    isValid: validation?.valid ?? false,
    hasCode: promoCode.trim().length > 0,
    
    // Actions
    setPromoCode: updatePromoCode,
    validateCode,
    clearPromoCode,
    getPricingUrl,
  };
};
