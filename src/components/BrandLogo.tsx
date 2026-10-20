import "./brand-logo.css";

interface BrandLogoProps {

  tone?: "light" | "dark";
}


export default function BrandLogo({ tone = "light" }: BrandLogoProps) {
  return (
    <span className={`pxs-logo pxs-logo--${tone}`}>
      <svg className="pxs-logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="9" fill="#264D3B" />
        <path d="M16 9.367A7.5 7.5 0 0 1 16 22.633A7.5 7.5 0 0 1 16 9.367Z" fill="#E8C98A" />
        <circle cx="12.5" cy="16" r="7.5" stroke="#F4EFE2" strokeWidth="1.8" />
        <circle cx="19.5" cy="16" r="7.5" stroke="#F4EFE2" strokeWidth="1.8" />
      </svg>
      <span className="pxs-logo-word">
        Proxi<span>Speak</span>
      </span>
    </span>
  );
}
