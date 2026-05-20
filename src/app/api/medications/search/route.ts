import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Run at the edge for lowest global latency

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ terms: [] });
  }

  try {
    // getDisplayTerms proxy hitting NIH Prescribable content RxTerms endpoint
    const response = await fetch(
      `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(query)}&ef=STRENGTHS_AND_FORMS,RXCUIS`,
      {
        next: { revalidate: 86400 } // Cache terms for 24 hours on Edge CDN to maximize performance
      }
    );

    if (!response.ok) {
      throw new Error('NIH RxTerms API fetch failure');
    }

    const data = await response.json();
    const rawNames = data[1] || [];
    const extraFields = data[2] || {};
    const strengthsList = extraFields.STRENGTHS_AND_FORMS || [];
    const rxcuis = extraFields.RXCUIS || [];

    // Construct highly structural suggestions object matching Bento boundaries
    const terms = rawNames.map((name: string, idx: number) => ({
      displayName: name,
      genericName: name.split(' (')[0],
      strengthsList: strengthsList[idx] || [],
      rxcui: rxcuis[idx]?.[0] || null
    }));

    return NextResponse.json({ terms: terms.slice(0, 10) });
  } catch (error) {
    console.error('Autocomplete backend failure:', error);
    return NextResponse.json({ terms: [] }, { status: 500 });
  }
}
