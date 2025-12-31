import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = [
  // African Countries (alphabetical by name)
  { code: "+213", country: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "+244", country: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "+229", country: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "+267", country: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "+226", country: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "+257", country: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "+238", country: "CV", name: "Cabo Verde", flag: "🇨🇻" },
  { code: "+237", country: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "+236", country: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", country: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "+269", country: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "+243", country: "CD", name: "Congo (DRC)", flag: "🇨🇩" },
  { code: "+242", country: "CG", name: "Congo (Republic)", flag: "🇨🇬" },
  { code: "+225", country: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+253", country: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "+20", country: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+240", country: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+291", country: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "+268", country: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "+251", country: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+241", country: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "+220", country: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "+233", country: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "+224", country: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "+245", country: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+254", country: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+266", country: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "+231", country: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "+218", country: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "+261", country: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "+265", country: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "+223", country: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "+222", country: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "+230", country: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "+212", country: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "+258", country: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "+264", country: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "+227", country: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "+234", country: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+250", country: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "+239", country: "ST", name: "São Tomé and Príncipe", flag: "🇸🇹" },
  { code: "+221", country: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "+248", country: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "+232", country: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "+252", country: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "+27", country: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+211", country: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "+249", country: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "+255", country: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "+228", country: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "+216", country: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "+256", country: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "+260", country: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
  // International
  { code: "+1", country: "US", name: "United States", flag: "🇺🇸" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+49", country: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "FR", name: "France", flag: "🇫🇷" },
  { code: "+31", country: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+971", country: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+86", country: "CN", name: "China", flag: "🇨🇳" },
  { code: "+81", country: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+65", country: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+55", country: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "MX", name: "Mexico", flag: "🇲🇽" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
}

export function PhoneInput({ value, onChange, className, id, required }: PhoneInputProps) {
  // Parse existing value to extract country code and number
  const parsePhone = (phone: string) => {
    for (const c of COUNTRY_CODES) {
      if (phone.startsWith(c.code)) {
        return { countryCode: c.code, number: phone.slice(c.code.length) };
      }
    }
    return { countryCode: "+254", number: phone.replace(/^\+/, "") }; // Default to Kenya
  };

  const { countryCode, number } = parsePhone(value);
  const [selectedCode, setSelectedCode] = React.useState(countryCode);
  const [phoneNumber, setPhoneNumber] = React.useState(number);

  React.useEffect(() => {
    const { countryCode: parsedCode, number: parsedNumber } = parsePhone(value);
    setSelectedCode(parsedCode);
    setPhoneNumber(parsedNumber);
  }, [value]);

  const handleCodeChange = (code: string) => {
    setSelectedCode(code);
    onChange(`${code}${phoneNumber}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/[^0-9]/g, "");
    setPhoneNumber(num);
    onChange(`${selectedCode}${num}`);
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCode);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={selectedCode} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-[200px] shrink-0">
          <SelectValue>
            {selectedCountry?.flag} {selectedCountry?.name || "Kenya"} ({selectedCode})
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card max-h-[300px]">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} {c.name} ({c.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        placeholder="8123456789"
        value={phoneNumber}
        onChange={handleNumberChange}
        required={required}
        className="flex-1"
      />
    </div>
  );
}
