import { useState, useEffect, useCallback } from 'react';
import type { CreateProjectData } from '../lib/api';
import type { TemplateSetupMethod } from '../components/TemplateSetupGuide';

// Enhanced Wizard State Management Hook
// Integrates with existing formData while providing guided workflow state

export interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  templateSetupMethod: TemplateSetupMethod;
  actionNetworkEnabled: boolean;
  discoveredResources: any | null;
  advancedMode: boolean;
  testingMode: boolean;
}

interface UseWizardStateProps {
  formData: CreateProjectData;
  totalSteps?: number;
}

interface UseWizardStateReturn {
  wizardState: WizardState;
  setWizardState: (updates: Partial<WizardState>) => void;
  
  // Step navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  
  // Step validation
  canProceedFromStep: (step: number) => boolean;
  getStepValidationErrors: (step: number) => string[];
  markStepComplete: (step: number) => void;
  
  // Template method management
  setTemplateSetupMethod: (method: TemplateSetupMethod) => void;
  
  // Action Network management
  setActionNetworkEnabled: (enabled: boolean) => void;
  setDiscoveredResources: (resources: any) => void;
  
  // Advanced mode toggle
  toggleAdvancedMode: () => void;
  
  // Testing mode management
  setTestingMode: (enabled: boolean) => void;
  
  // Progress calculation
  getOverallProgress: () => number;
  getStepProgress: (step: number) => number;
}

export function useWizardState({ 
  formData, 
  totalSteps = 5 
}: UseWizardStateProps): UseWizardStateReturn {
  const [wizardState, setWizardStateInternal] = useState<WizardState>(() => ({
    currentStep: 1,
    completedSteps: new Set<number>(),
    templateSetupMethod: 'upload',
    actionNetworkEnabled: Boolean(formData.action_network_api_key),
    discoveredResources: null,
    advancedMode: false,
    testingMode: Boolean(formData.test_submission_email),
  }));

  // Sync wizard state with formData changes
  useEffect(() => {
    setWizardStateInternal(prev => ({
      ...prev,
      actionNetworkEnabled: Boolean(formData.action_network_api_key),
      testingMode: Boolean(formData.test_submission_email),
    }));
  }, [formData.action_network_api_key, formData.test_submission_email]);

  // Update wizard state with partial updates
  const setWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardStateInternal(prev => ({ ...prev, ...updates }));
  }, []);

  // Step validation logic
  const canProceedFromStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Basic Information
        return Boolean(
          formData.name &&
          formData.slug &&
          formData.council_name &&
          formData.council_email
        );
        
      case 2: // Council Configuration  
        return Boolean(
          formData.council_name &&
          formData.council_email &&
          formData.default_application_number
        );
        
      case 3: // Template Setup
        if (formData.is_dual_track) {
          return Boolean(
            formData.cover_template_id &&
            formData.dual_track_config?.original_grounds_template_id &&
            formData.dual_track_config?.followup_grounds_template_id
          );
        } else {
          return Boolean(
            formData.cover_template_id &&
            formData.grounds_template_id
          );
        }
        
      case 4: // Action Network (optional)
        return true; // Always can proceed since Action Network is optional
        
      case 5: // Review & Launch
        return canProceedFromStep(1) && canProceedFromStep(2) && canProceedFromStep(3);
        
      default:
        return true;
    }
  }, [formData]);

  // Get validation errors for a step
  const getStepValidationErrors = useCallback((step: number): string[] => {
    const errors: string[] = [];
    
    switch (step) {
      case 1:
        if (!formData.name) errors.push('Project name is required');
        if (!formData.slug) errors.push('URL slug is required');
        break;
        
      case 2:
        if (!formData.council_name) errors.push('Council name is required');
        if (!formData.council_email) errors.push('Council email is required');
        if (!formData.default_application_number) errors.push('Default application number is required');
        break;
        
      case 3:
        if (!formData.cover_template_id) errors.push('Cover template is required');
        
        if (formData.is_dual_track) {
          if (!formData.dual_track_config?.original_grounds_template_id) {
            errors.push('Comprehensive grounds template is required');
          }
          if (!formData.dual_track_config?.followup_grounds_template_id) {
            errors.push('Follow-up grounds template is required');
          }
        } else {
          if (!formData.grounds_template_id) errors.push('Grounds template is required');
        }
        break;
        
      case 4:
        // Action Network is optional, so no required errors
        if (wizardState.actionNetworkEnabled && !formData.action_network_api_key) {
          errors.push('API key is required when Action Network is enabled');
        }
        break;
        
      case 5:
        // Aggregate all previous step errors
        for (let i = 1; i < 5; i++) {
          errors.push(...getStepValidationErrors(i));
        }
        break;
    }
    
    return errors;
  }, [formData, wizardState.actionNetworkEnabled]);

  // Mark step as complete
  const markStepComplete = useCallback((step: number) => {
    setWizardState({
      completedSteps: new Set([...Array.from(wizardState.completedSteps), step])
    });
  }, [wizardState.completedSteps, setWizardState]);

  // Step navigation
  const nextStep = useCallback(() => {
    if (wizardState.currentStep < totalSteps && canProceedFromStep(wizardState.currentStep)) {
      markStepComplete(wizardState.currentStep);
      setWizardState({ currentStep: wizardState.currentStep + 1 });
    }
  }, [wizardState.currentStep, totalSteps, canProceedFromStep, markStepComplete, setWizardState]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 1) {
      setWizardState({ currentStep: wizardState.currentStep - 1 });
    }
  }, [wizardState.currentStep, setWizardState]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      // Can only go forward if all previous steps are valid
      const canGo = step <= wizardState.currentStep || 
        Array.from({ length: step - 1 }, (_, i) => i + 1).every(canProceedFromStep);
      
      if (canGo) {
        setWizardState({ currentStep: step });
      }
    }
  }, [totalSteps, wizardState.currentStep, canProceedFromStep, setWizardState]);

  // Template setup method
  const setTemplateSetupMethod = useCallback((method: TemplateSetupMethod) => {
    setWizardState({ templateSetupMethod: method });
  }, [setWizardState]);

  // Action Network management
  const setActionNetworkEnabled = useCallback((enabled: boolean) => {
    setWizardState({ actionNetworkEnabled: enabled });
  }, [setWizardState]);

  const setDiscoveredResources = useCallback((resources: any) => {
    setWizardState({ discoveredResources: resources });
  }, [setWizardState]);

  // Advanced mode
  const toggleAdvancedMode = useCallback(() => {
    setWizardState({ advancedMode: !wizardState.advancedMode });
  }, [wizardState.advancedMode, setWizardState]);

  // Testing mode
  const setTestingMode = useCallback((enabled: boolean) => {
    setWizardState({ testingMode: enabled });
  }, [setWizardState]);

  // Progress calculations
  const getOverallProgress = useCallback((): number => {
    const completedCount = wizardState.completedSteps.size;
    return (completedCount / totalSteps) * 100;
  }, [wizardState.completedSteps, totalSteps]);

  const getStepProgress = useCallback((step: number): number => {
    const errors = getStepValidationErrors(step);
    const canProceed = canProceedFromStep(step);
    
    if (canProceed) return 100;
    
    // Partial progress based on filled fields
    switch (step) {
      case 1:
        let step1Progress = 0;
        if (formData.name) step1Progress += 25;
        if (formData.slug) step1Progress += 25;
        if (formData.council_name) step1Progress += 25;
        if (formData.council_email) step1Progress += 25;
        return step1Progress;
        
      case 2:
        let step2Progress = 0;
        if (formData.council_name) step2Progress += 33;
        if (formData.council_email) step2Progress += 33;
        if (formData.default_application_number) step2Progress += 34;
        return step2Progress;
        
      case 3:
        let step3Progress = 0;
        const totalTemplates = formData.is_dual_track ? 3 : 2;
        
        if (formData.cover_template_id) step3Progress += (100 / totalTemplates);
        
        if (formData.is_dual_track) {
          if (formData.dual_track_config?.original_grounds_template_id) step3Progress += (100 / totalTemplates);
          if (formData.dual_track_config?.followup_grounds_template_id) step3Progress += (100 / totalTemplates);
        } else {
          if (formData.grounds_template_id) step3Progress += (100 / totalTemplates);
        }
        
        return step3Progress;
        
      default:
        return errors.length === 0 ? 100 : 0;
    }
  }, [formData, getStepValidationErrors, canProceedFromStep]);

  return {
    wizardState,
    setWizardState,
    
    // Navigation
    nextStep,
    previousStep,
    goToStep,
    
    // Validation
    canProceedFromStep,
    getStepValidationErrors,
    markStepComplete,
    
    // Method management
    setTemplateSetupMethod,
    
    // Action Network
    setActionNetworkEnabled,
    setDiscoveredResources,
    
    // Advanced mode
    toggleAdvancedMode,
    
    // Testing
    setTestingMode,
    
    // Progress
    getOverallProgress,
    getStepProgress,
  };
}

// Helper function to determine if wizard state is ready for project creation
export function isWizardReadyForCreation(
  formData: CreateProjectData,
  wizardState: WizardState
): { ready: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check all required fields
  if (!formData.name) errors.push('Project name is required');
  if (!formData.slug) errors.push('URL slug is required');
  if (!formData.council_name) errors.push('Council name is required');
  if (!formData.council_email) errors.push('Council email is required');
  if (!formData.default_application_number) errors.push('Default application number is required');
  if (!formData.cover_template_id) errors.push('Cover template is required');
  
  if (formData.is_dual_track) {
    if (!formData.dual_track_config?.original_grounds_template_id) {
      errors.push('Comprehensive grounds template is required for dual track');
    }
    if (!formData.dual_track_config?.followup_grounds_template_id) {
      errors.push('Follow-up grounds template is required for dual track');
    }
  } else {
    if (!formData.grounds_template_id) errors.push('Grounds template is required');
  }
  
  // Check Action Network if enabled
  if (wizardState.actionNetworkEnabled && !formData.action_network_api_key) {
    errors.push('Action Network API key is required when integration is enabled');
  }
  
  return {
    ready: errors.length === 0,
    errors
  };
}
