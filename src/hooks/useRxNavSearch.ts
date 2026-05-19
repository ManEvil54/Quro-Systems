import { useState, useEffect } from 'react';

export function useRxNavSearch(searchQuery: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      const timer = setTimeout(() => {
        setSuggestions([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        const results = data[1] || [];
        // Only take the top 10 to keep the UI clean
        setSuggestions(results.slice(0, 10));
      } catch (err) {
        console.error('Error fetching RxNav suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return { suggestions, loading };
}
