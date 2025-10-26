"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: string;
}

interface AddressSuggestion {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressValidationResult {
  isValid: boolean;
  formatted_address?: string;
  components?: {
    street_number?: string;
    route?: string;
    locality?: string;
    administrative_area_level_1?: string;
    postal_code?: string;
    country?: string;
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Ingrese su dirección",
  className = "",
  required = false,
  error
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Simular API de Google Places (fallback para desarrollo)
  const mockAddresses = [
    {
      description: "Av. Javier Prado Este 123, San Isidro, Lima",
      place_id: "mock_1",
      structured_formatting: {
        main_text: "Av. Javier Prado Este 123",
        secondary_text: "San Isidro, Lima"
      }
    },
    {
      description: "Av. La Marina 456, Pueblo Libre, Lima",
      place_id: "mock_2", 
      structured_formatting: {
        main_text: "Av. La Marina 456",
        secondary_text: "Pueblo Libre, Lima"
      }
    },
    {
      description: "Jr. Comercio 789, Cercado de Lima, Lima",
      place_id: "mock_3",
      structured_formatting: {
        main_text: "Jr. Comercio 789", 
        secondary_text: "Cercado de Lima, Lima"
      }
    }
  ];

  // Función para buscar direcciones
  const searchAddresses = async (query: string): Promise<AddressSuggestion[]> => {
    try {
      // Intentar usar Google Places API si está disponible
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        return new Promise((resolve, reject) => {
          const service = new (window as any).google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: query,
              componentRestrictions: { country: 'pe' }, // Restringir a Perú
              types: ['address']
            },
            (predictions: any[], status: any) => {
              if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
                resolve(predictions || []);
              } else {
                reject(new Error('Error en Google Places API'));
              }
            }
          );
        });
      } else {
        // Fallback: usar direcciones mock filtradas
        const filtered = mockAddresses.filter(addr => 
          addr.description.toLowerCase().includes(query.toLowerCase())
        );
        return Promise.resolve(filtered);
      }
    } catch (error) {
      console.error('Error buscando direcciones:', error);
      setApiError("Servicio de direcciones no disponible. Ingrese la dirección manualmente.");
      return [];
    }
  };

  // Función para validar dirección seleccionada
  const validateAddress = async (placeId: string): Promise<AddressValidationResult> => {
    try {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        return new Promise((resolve) => {
          const service = new (window as any).google.maps.places.PlacesService(
            document.createElement('div')
          );
          service.getDetails(
            {
              placeId: placeId,
              fields: ['formatted_address', 'address_components']
            },
            (place: any, status: any) => {
              if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
                const components: any = {};
                place.address_components?.forEach((component: any) => {
                  const types = component.types;
                  if (types.includes('street_number')) {
                    components.street_number = component.long_name;
                  }
                  if (types.includes('route')) {
                    components.route = component.long_name;
                  }
                  if (types.includes('locality')) {
                    components.locality = component.long_name;
                  }
                  if (types.includes('administrative_area_level_1')) {
                    components.administrative_area_level_1 = component.long_name;
                  }
                  if (types.includes('postal_code')) {
                    components.postal_code = component.long_name;
                  }
                  if (types.includes('country')) {
                    components.country = component.long_name;
                  }
                });

                resolve({
                  isValid: true,
                  formatted_address: place.formatted_address,
                  components
                });
              } else {
                resolve({ isValid: false });
              }
            }
          );
        });
      } else {
        // Fallback: validación simple
        const hasStreet = /\d+/.test(value); // Contiene números
        const hasText = /[a-zA-Z]/.test(value); // Contiene letras
        const minLength = value.length >= 10;
        const isValid = hasStreet && hasText && minLength;
        
        if (!isValid) {
          setValidationError("La dirección debe contener al menos números, letras y tener mínimo 10 caracteres");
        } else {
          setValidationError("");
        }
        
        return Promise.resolve({
          isValid,
          formatted_address: value
        });
      }
    } catch (error) {
      console.error('Error validando dirección:', error);
      setValidationError("Error al validar la dirección");
      return { isValid: false };
    }
  };

  // Manejar cambios en el input
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue, false);
    
    // Limpiar errores previos
    setApiError(null);
    setValidationError("");
    
    if (newValue.length > 2) {
      setIsLoading(true);
      
      try {
        const results = await searchAddresses(newValue);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        setApiError("Error al buscar direcciones. Intente nuevamente.");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsValidAddress(null);
    }
    
    // Validar dirección si tiene contenido suficiente
    if (newValue.length >= 10) {
      await validateAddress(newValue);
    }
  };

  // Manejar selección de sugerencia
  const handleSuggestionSelect = async (suggestion: AddressSuggestion) => {
    setShowSuggestions(false);
    setIsLoading(true);
    
    try {
      const validation = await validateAddress(suggestion.place_id);
      
      if (validation.isValid) {
        const finalAddress = validation.formatted_address || suggestion.description;
        onChange(finalAddress, true);
        setIsValidAddress(true);
        setValidationError("");
        setApiError(null);
      } else {
        setValidationError("No se pudo validar la dirección seleccionada");
        onChange(suggestion.description, false);
      }
    } catch (error) {
      console.error('Error validando dirección:', error);
      setValidationError("Error al validar la dirección");
      onChange(suggestion.description, false);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors
    ${error || validationError ? 'border-red-500 focus:ring-red-500' : 
      isValidAddress ? 'border-green-500 focus:ring-green-500' : 
      'border-gray-300 focus:ring-blue-500'}
    ${className}
  `;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={inputClasses}
          required={required}
          autoComplete="off"
        />
        
        {/* Indicador de estado */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          {!isLoading && isValidAddress && (
            <div className="text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Lista de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="font-medium text-gray-900">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-sm text-gray-600">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensajes de error */}
      {(error || validationError || apiError) && (
        <div className="mt-1 text-sm text-red-600">
          {error || validationError || apiError}
        </div>
      )}

      {/* Mensaje de ayuda */}
      {!isValidAddress && !error && !validationError && !apiError && value.length >= 3 && (
        <div className="mt-1 text-xs text-gray-500">
          Seleccione una dirección de las sugerencias para validarla automáticamente
        </div>
      )}
    </div>
  );
}