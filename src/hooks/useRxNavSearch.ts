import { useState, useEffect } from 'react';

export function useRxNavSearch(searchQuery: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        const results = data?.suggestionGroup?.suggestionList?.suggestion || [];
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
