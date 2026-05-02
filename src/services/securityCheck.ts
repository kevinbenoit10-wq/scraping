import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
}

// Paths that only exist on jailbroken iOS devices
const IOS_JAILBREAK_PATHS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/apt',
];

async function isJailbrokenIOS(): Promise<boolean> {
  for (const path of IOS_JAILBREAK_PATHS) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return true;
    } catch {
      // Access denied to path — itself a sign of jailbreak (sandbox escape attempt)
    }
  }
  return false;
}

export async function runSecurityCheck(): Promise<SecurityCheckResult> {
  // expo-device's rooted check covers Android reliably
  if (Platform.OS === 'android') {
    const rooted = await Device.isRootedExperimentalAsync();
    if (rooted) {
      return { safe: false, reason: 'geroot' };
    }
  }

  if (Platform.OS === 'ios') {
    const jailbroken = await isJailbrokenIOS();
    if (jailbroken) {
      return { safe: false, reason: 'gejailbreakt' };
    }
  }

  return { safe: true };
}
