/**
 * Admin API - Hybrid Model Settings
 * 
 * GET: Retrieve current hybrid system settings
 * POST: Update hybrid system settings
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface HybridSettings {
  upgradeThreshold: number;
  enableFallback: boolean;
  primaryModel: 'sdxl' | 'gemini';
  sdxlTimeout: number;
  geminiTimeout: number;
  enableUsageTracking: boolean;
  costAlerts: boolean;
  maxCostPerSession: number;
  updatedAt: string;
  updatedBy: string;
}

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'hybrid-settings.json');

// Default settings
const DEFAULT_SETTINGS: HybridSettings = {
  upgradeThreshold: 3,
  enableFallback: true,
  primaryModel: 'sdxl',
  sdxlTimeout: 60000,
  geminiTimeout: 45000,
  enableUsageTracking: true,
  costAlerts: true,
  maxCostPerSession: 1.0,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

/**
 * Load settings from file
 */
function loadSettings(): HybridSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('Failed to load hybrid settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to file
 */
function saveSettings(settings: HybridSettings): boolean {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Add metadata
    const settingsWithMeta = {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin'
    };
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsWithMeta, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save hybrid settings:', error);
    return false;
  }
}

/**
 * Validate settings
 */
function validateSettings(settings: any): string | null {
  if (!settings || typeof settings !== 'object') {
    return 'Invalid settings object';
  }
  
  if (typeof settings.upgradeThreshold !== 'number' || settings.upgradeThreshold < 1 || settings.upgradeThreshold > 20) {
    return 'upgradeThreshold must be a number between 1 and 20';
  }
  
  if (typeof settings.enableFallback !== 'boolean') {
    return 'enableFallback must be a boolean';
  }
  
  if (!['sdxl', 'gemini'].includes(settings.primaryModel)) {
    return 'primaryModel must be either "sdxl" or "gemini"';
  }
  
  if (typeof settings.sdxlTimeout !== 'number' || settings.sdxlTimeout < 10000 || settings.sdxlTimeout > 300000) {
    return 'sdxlTimeout must be between 10000ms and 300000ms (10s to 5min)';
  }
  
  if (typeof settings.geminiTimeout !== 'number' || settings.geminiTimeout < 10000 || settings.geminiTimeout > 300000) {
    return 'geminiTimeout must be between 10000ms and 300000ms (10s to 5min)';
  }
  
  if (typeof settings.maxCostPerSession !== 'number' || settings.maxCostPerSession < 0.1 || settings.maxCostPerSession > 10) {
    return 'maxCostPerSession must be between $0.10 and $10.00';
  }
  
  return null;
}

/**
 * GET - Retrieve current settings
 */
export async function GET() {
  try {
    const settings = loadSettings();
    
    return NextResponse.json({
      success: true,
      settings,
      metadata: {
        settingsFile: SETTINGS_FILE,
        lastUpdated: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    console.error('Failed to retrieve hybrid settings:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve settings',
      settings: DEFAULT_SETTINGS
    }, { status: 500 });
  }
}

/**
 * POST - Update settings
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings } = body;
    
    if (!settings) {
      return NextResponse.json({
        success: false,
        error: 'Settings object is required'
      }, { status: 400 });
    }
    
    // Validate settings
    const validationError = validateSettings(settings);
    if (validationError) {
      return NextResponse.json({
        success: false,
        error: `Validation failed: ${validationError}`
      }, { status: 400 });
    }
    
    // Merge with current settings to preserve any additional fields
    const currentSettings = loadSettings();
    const updatedSettings: HybridSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin'
    };
    
    // Save settings
    const saveSuccess = saveSettings(updatedSettings);
    if (!saveSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save settings to file'
      }, { status: 500 });
    }
    
    console.log('✅ Hybrid settings updated:', {
      upgradeThreshold: updatedSettings.upgradeThreshold,
      primaryModel: updatedSettings.primaryModel,
      enableFallback: updatedSettings.enableFallback,
      updatedAt: updatedSettings.updatedAt
    });
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Failed to update hybrid settings:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings'
    }, { status: 500 });
  }
}

/**
 * PUT - Reset to default settings
 */
export async function PUT() {
  try {
    const resetSettings = {
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin_reset'
    };
    
    const saveSuccess = saveSettings(resetSettings);
    if (!saveSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to reset settings'
      }, { status: 500 });
    }
    
    console.log('🔄 Hybrid settings reset to defaults');
    
    return NextResponse.json({
      success: true,
      settings: resetSettings,
      message: 'Settings reset to defaults'
    });
    
  } catch (error) {
    console.error('Failed to reset hybrid settings:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset settings'
    }, { status: 500 });
  }
}