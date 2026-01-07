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
import { COUNTRIES } from "@/data";

// Transform COUNTRIES data to phone input format
const COUNTRY_CODES = COUNTRIES.map(c => ({
  code: c.dialCode,
  country: c.code,
  name: c.name,
  flag: c.flag,
}));

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
          {COUNTRY_CODES.map((c, index) => (
            <SelectItem key={`${c.code}-${c.country}-${index}`} value={c.code}>
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
