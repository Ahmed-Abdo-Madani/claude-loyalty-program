import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const GooglePlacesAutocomplete = ({ onPlaceSelect, className = '', placeholder = '' }) => {
    const { t, i18n } = useTranslation('common');
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const autocompleteService = useRef(null);
    const placesService = useRef(null);
    const sessionToken = useRef(null);

    useEffect(() => {
        if (!apiKey) {
            console.warn('⚠️ Google Maps API Key is missing. Smart Fill will not work.');
            return;
        }

        // Load Google Maps Script if not already loaded
        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${i18n.language}`;
            script.async = true;
            script.defer = true;
            script.onload = initAutocomplete;
            document.head.appendChild(script);
        } else {
            initAutocomplete();
        }

        function initAutocomplete() {
            if (window.google && !autocompleteService.current) {
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
                placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
                sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
            }
        }

        // Close dropdown on click outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [apiKey, i18n.language]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        if (value.length > 2 && autocompleteService.current) {
            setIsLoading(true);
            autocompleteService.current.getPlacePredictions(
                {
                    input: value,
                    sessionToken: sessionToken.current,
                    componentRestrictions: { country: 'sa' }, // Restrict to Saudi Arabia
                    types: ['establishment']
                },
                (predictions, status) => {
                    setIsLoading(false);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                        setSuggestions(predictions);
                        setIsOpen(true);
                    } else {
                        setSuggestions([]);
                        setIsOpen(false);
                    }
                }
            );
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const handleSelectSuggestion = (suggestion) => {
        setInputValue(suggestion.description);
        setIsOpen(false);
        setIsLoading(true);

        if (placesService.current) {
            placesService.current.getDetails(
                {
                    placeId: suggestion.place_id,
                    fields: ['name', 'formatted_address', 'address_components', 'geometry', 'formatted_phone_number', 'website'],
                    sessionToken: sessionToken.current
                },
                (place, status) => {
                    setIsLoading(false);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                        // New session token for next session
                        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();

                        // Extract address components
                        const address = place.formatted_address;
                        const components = place.address_components;

                        const findComponent = (type) => {
                            const comp = components.find(c => c.types.includes(type));
                            return comp ? comp.long_name : '';
                        };

                        const extractedData = {
                            business_name: place.name,
                            address: address,
                            city: findComponent('locality') || findComponent('administrative_area_level_2'),
                            region: findComponent('administrative_area_level_1'),
                            phone: place.formatted_phone_number,
                            website: place.website,
                            location_data: {
                                id: suggestion.place_id,
                                type: 'google_place',
                                name_en: place.name,
                                hierarchy: address
                            }
                        };

                        onPlaceSelect(extractedData);
                    }
                }
            );
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder || t('registration.smartFill.searchPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {isLoading && (
                    <div className="absolute right-3 top-3.5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                >
                    {suggestions.map((s) => (
                        <button
                            key={s.place_id}
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                        >
                            <div className="font-medium text-gray-900 dark:text-white">{s.structured_formatting.main_text}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{s.structured_formatting.secondary_text}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GooglePlacesAutocomplete;
