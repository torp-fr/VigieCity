/**
 * Step 2: Admin Principal Contact Form
 * Email, name, and password for EPCI admin or commune admin
 */

import { useState } from "react";
import { User, Eye, EyeOff } from "lucide-react";
import { type AdminContact, validatePassword, validateEmail } from "@/lib/onboarding-utils";

interface AdminContactFormProps {
  value: AdminContact;
  onChange: (admin: AdminContact) => void;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  showPassword?: boolean;
}

export function AdminContactForm({
  value,
  onChange,
  title,
  subtitle,
  disabled,
  showPassword: defaultShowPassword,
}: AdminContactFormProps) {
  const [showPassword, setShowPassword] = useState(defaultShowPassword ?? false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  function updateField<K extends keyof AdminContact>(key: K, val: AdminContact[K]) {
    onChange({ ...value, [key]: val });
  }

  const emailError = value.email && !validateEmail(value.email) ? "Email invalide" : null;

  const passwordValidation = value.password ? validatePassword(value.password) : { isValid: true, errors: [] };
  const passwordError = value.password && !passwordValidation.isValid ? passwordValidation : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold mb-1">
          <User className="h-4 w-4 text-blue-600" />
          {title ?? "Compte administrateur principal"}
        </h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="space-y-3">
        {/* Email */}
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-xs font-medium text-muted-foreground">
            Email de l'admin *
          </label>
          <input
            id="admin-email"
            type="email"
            value={value.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="admin@commune.fr"
            disabled={disabled}
            className={`w-full rounded-lg border ${
              emailError ? "border-red-500" : "border-border"
            } bg-background px-3 py-2 text-sm disabled:opacity-50`}
          />
          {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="admin-name" className="mb-1 block text-xs font-medium text-muted-foreground">
            Nom complet
          </label>
          <input
            id="admin-name"
            type="text"
            value={value.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Jean Dupont"
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>

        {/* Phone (optional) */}
        <div>
          <label htmlFor="admin-phone" className="mb-1 block text-xs font-medium text-muted-foreground">
            Téléphone (optionnel)
          </label>
          <input
            id="admin-phone"
            type="tel"
            value={value.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="06 12 34 56 78"
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-xs font-medium text-muted-foreground">
            Mot de passe initial *
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={value.password || ""}
              onChange={(e) => updateField("password", e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Min. 8 caractères, 1 maj, 1 chiffre, 1 caractère spécial"
              disabled={disabled}
              className={`w-full rounded-lg border ${
                passwordError && !passwordFocused ? "border-red-500" : "border-border"
              } bg-background px-3 py-2 pr-10 text-sm disabled:opacity-50`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Masquer" : "Afficher"}
              disabled={disabled}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password requirements */}
          {value.password && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Exigences:</p>
              <ul className="space-y-0.5 text-xs">
                <li
                  className={`flex items-center gap-1.5 ${
                    value.password.length >= 8 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <span className={value.password.length >= 8 ? "text-lg" : ""}>•</span>
                  Au minimum 8 caractères
                </li>
                <li
                  className={`flex items-center gap-1.5 ${
                    /[A-Z]/.test(value.password) ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <span className={/[A-Z]/.test(value.password) ? "text-lg" : ""}>•</span>
                  Au moins 1 majuscule
                </li>
                <li
                  className={`flex items-center gap-1.5 ${
                    /[0-9]/.test(value.password) ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <span className={/[0-9]/.test(value.password) ? "text-lg" : ""}>•</span>
                  Au moins 1 chiffre
                </li>
                <li
                  className={`flex items-center gap-1.5 ${
                    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value.password)
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <span
                    className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value.password) ? "text-lg" : ""}
                  >
                    •
                  </span>
                  Au moins 1 caractère spécial (!@#$%...)
                </li>
              </ul>
            </div>
          )}

          <p className="mt-2 text-[11px] text-muted-foreground">
            L'admin recevra ces identifiants et pourra changer son mot de passe depuis son profil.
            Ce mot de passe n'est jamais stocké en clair.
          </p>
        </div>
      </div>
    </div>
  );
}
