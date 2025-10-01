import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useState, useRef } from 'react';

const libraries: ("places")[] = ["places"];

interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string;  // Suburb/City
  administrative_area_level_1?: string;  // State
  postal_code?: string;
}

// Map Australian state names to abbreviations
const stateMapping: Record<string, string> = {
  'Queensland': 'QLD',
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
  // Also handle if Google returns abbreviations
  'QLD': 'QLD',
  'NSW': 'NSW',
  'VIC': 'VIC',
  'SA': 'SA',
  'WA': 'WA',
  'TAS': 'TAS',
  'NT': 'NT',
  'ACT': 'ACT'
};

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onAddressSelect?: (components: {
    fullAddress: string;
    suburb: string;
    state: string;
    postcode: string;
  }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function GoogleAddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing your address...",
  required = false,
  className = ""
}: GoogleAddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (!place.address_components) {
        return;
      }

      // Parse address components
      const components: AddressComponents = {};
      place.address_components.forEach((component) => {
        const type = component.types[0];
        components[type as keyof AddressComponents] = component.long_name;
      });

      // Build the street address
      const streetNumber = components.street_number || '';
      const route = components.route || '';
      const streetAddress = `${streetNumber} ${route}`.trim();
      
      const suburb = components.locality || '';
      const stateFullName = components.administrative_area_level_1 || '';
      // Map state name to abbreviation (e.g., "Queensland" -> "QLD")
      const state = stateMapping[stateFullName] || stateFullName;
      const postcode = components.postal_code || '';
      
      // Update the input value
      setInputValue(streetAddress);
      onChange(streetAddress);
      
      // Call the callback with parsed components
      if (onAddressSelect) {
        onAddressSelect({
          fullAddress: streetAddress,
          suburb,
          state,
          postcode
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // Fallback to regular input if API key is not set or loading fails
  if (!apiKey || loadError) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={onChange as any}
          className={className}
          placeholder={placeholder}
          required={required}
        />
        {!apiKey && (
          <p className="text-xs text-amber-600 mt-1">
            ℹ️ Address autocomplete unavailable - API key not configured
          </p>
        )}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={onChange as any}
        className={className}
        placeholder="Loading address lookup..."
        disabled
        required={required}
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'au' }, // Restrict to Australia
        types: ['address'], // Only show full addresses
        fields: ['address_components', 'formatted_address']
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className={className}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
    </Autocomplete>
  );
}

