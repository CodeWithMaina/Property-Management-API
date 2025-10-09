// services/auth/PasswordService.ts
import bcrypt from 'bcrypt';
import { PASSWORD_CONFIG, PasswordValidationResult } from './auth.types';

export class PasswordService {
  private config = PASSWORD_CONFIG;

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.config.saltRounds);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  validatePasswordPolicy(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}