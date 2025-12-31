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
  { code: "+234", country: "NG", name: "Nigeria" },
  { code: "+27", country: "ZA", name: "South Africa" },
  { code: "+254", country: "KE", name: "Kenya" },
  { code: "+233", country: "GH", name: "Ghana" },
  { code: "+20", country: "EG", name: "Egypt" },
  { code: "+212", country: "MA", name: "Morocco" },
  { code: "+256", country: "UG", name: "Uganda" },
  { code: "+255", country: "TZ", name: "Tanzania" },
  { code: "+251", country: "ET", name: "Ethiopia" },
  { code: "+237", country: "CM", name: "Cameroon" },
  { code: "+225", country: "CI", name: "Côte d'Ivoire" },
  { code: "+221", country: "SN", name: "Senegal" },
  { code: "+263", country: "ZW", name: "Zimbabwe" },
  { code: "+260", country: "ZM", name: "Zambia" },
  { code: "+250", country: "RW", name: "Rwanda" },
  { code: "+267", country: "BW", name: "Botswana" },
  { code: "+264", country: "NA", name: "Namibia" },
  { code: "+265", country: "MW", name: "Malawi" },
  { code: "+258", country: "MZ", name: "Mozambique" },
  { code: "+226", country: "BF", name: "Burkina Faso" },
  { code: "+223", country: "ML", name: "Mali" },
  { code: "+227", country: "NE", name: "Niger" },
  { code: "+229", country: "BJ", name: "Benin" },
  { code: "+228", country: "TG", name: "Togo" },
  { code: "+230", country: "MU", name: "Mauritius" },
  { code: "+1", country: "US", name: "United States" },
  { code: "+44", country: "GB", name: "United Kingdom" },
  { code: "+49", country: "DE", name: "Germany" },
  { code: "+33", country: "FR", name: "France" },
  { code: "+31", country: "NL", name: "Netherlands" },
  { code: "+971", country: "AE", name: "UAE" },
  { code: "+966", country: "SA", name: "Saudi Arabia" },
  { code: "+91", country: "IN", name: "India" },
  { code: "+86", country: "CN", name: "China" },
  { code: "+81", country: "JP", name: "Japan" },
  { code: "+82", country: "KR", name: "South Korea" },
  { code: "+65", country: "SG", name: "Singapore" },
  { code: "+61", country: "AU", name: "Australia" },
  { code: "+64", country: "NZ", name: "New Zealand" },
  { code: "+55", country: "BR", name: "Brazil" },
  { code: "+52", country: "MX", name: "Mexico" },
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
    return { countryCode: "+234", number: phone.replace(/^\+/, "") };
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

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={selectedCode} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-[110px] shrink-0">
          <SelectValue>
            {COUNTRY_CODES.find(c => c.code === selectedCode)?.country || "NG"} {selectedCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card max-h-[300px]">
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.country} {c.code}
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
