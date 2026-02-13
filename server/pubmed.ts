// PubMed E-utilities Service
// Fetches medical literature abstracts from NCBI PubMed

import type { PubMedArticle } from './types.js';

const EUTILS_BASE: string = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Search PubMed for articles matching a query
 * @param {string} query - Search terms (e.g., "acute pancreatitis treatment 2024")
 * @param {number} limit - Max results to return (default: 10)
 * @returns {Promise<{pmids: string[], count: number}>}
 */
export async function searchPubMed(query: string, limit: number = 10): Promise<{ pmids: string[]; count: number }> {
    const params: URLSearchParams = new URLSearchParams({
        db: 'pubmed',
        term: query,
        retmax: limit.toString(),
        retmode: 'json',
        sort: 'relevance',
        ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
        ...(process.env.NCBI_EMAIL && { email: process.env.NCBI_EMAIL }),
    });

    const response: Response = await fetch(`${EUTILS_BASE}/esearch.fcgi?${params}`);

    if (!response.ok) {
        throw new Error(`PubMed search failed: ${response.status}`);
    }

    const data: any = await response.json();

    return {
        pmids: data.esearchresult?.idlist || [],
        count: parseInt(data.esearchresult?.count || '0'),
    };
}

/**
 * Fetch abstracts for given PubMed IDs
 * @param {string[]} pmids - Array of PubMed IDs
 * @returns {Promise<Array<{pmid: string, title: string, abstract: string, authors: string, journal: string, year: string}>>}
 */
export async function fetchAbstracts(pmids: string[]): Promise<PubMedArticle[]> {
    if (!pmids.length) return [];

    const params: URLSearchParams = new URLSearchParams({
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
        rettype: 'abstract',
        ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
    });

    const response: Response = await fetch(`${EUTILS_BASE}/efetch.fcgi?${params}`);

    if (!response.ok) {
        throw new Error(`PubMed fetch failed: ${response.status}`);
    }

    const xmlText: string = await response.text();
    return parseArticlesXML(xmlText);
}

/**
 * Parse PubMed XML response to extract article data
 */
function parseArticlesXML(xmlText: string): PubMedArticle[] {
    const articles: PubMedArticle[] = [];

    // Simple regex-based XML parsing (works for PubMed's structure)
    const articleMatches: string[] = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

    for (const articleXml of articleMatches) {
        const pmid: string = extractTag(articleXml, 'PMID');
        const title: string = extractTag(articleXml, 'ArticleTitle');
        const abstractText: string = extractTag(articleXml, 'AbstractText') || extractAllAbstractText(articleXml);
        const journal: string = extractTag(articleXml, 'Title');
        const year: string = extractTag(articleXml, 'Year') || extractPubDate(articleXml);
        const authors: string = extractAuthors(articleXml);

        if (pmid && (title || abstractText)) {
            articles.push({
                pmid,
                title: cleanText(title),
                abstract: cleanText(abstractText),
                authors,
                journal: cleanText(journal),
                year,
            });
        }
    }

    return articles;
}

function extractTag(xml: string, tagName: string): string {
    const match: RegExpMatchArray | null = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match ? match[1] : '';
}

function extractAllAbstractText(xml: string): string {
    // Handle structured abstracts with multiple AbstractText elements
    const matches: string[] = xml.match(/<AbstractText[^>]*>[\s\S]*?<\/AbstractText>/gi) || [];
    return matches.map((m: string) => {
        const label: string | undefined = m.match(/Label="([^"]+)"/)?.[1];
        const text: string = m.match(/>([^<]+)</)?.[1] || '';
        return label ? `${label}: ${text}` : text;
    }).join(' ');
}

function extractPubDate(xml: string): string {
    const match: RegExpMatchArray | null = xml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    return match ? match[1] : '';
}

function extractAuthors(xml: string): string {
    const authorMatches: string[] = xml.match(/<Author[^>]*>[\s\S]*?<\/Author>/gi) || [];
    const authors: string[] = authorMatches.slice(0, 3).map((a: string) => {
        const lastName: string = extractTag(a, 'LastName');
        const initials: string = extractTag(a, 'Initials');
        return `${lastName} ${initials}`.trim();
    });

    if (authorMatches.length > 3) {
        authors.push('et al.');
    }

    return authors.join(', ');
}

function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
}

/**
 * Search and fetch abstracts in one call
 */
export async function searchAndFetchAbstracts(query: string, limit: number = 5): Promise<{ articles: PubMedArticle[]; query: string; count: number }> {
    const { pmids } = await searchPubMed(query, limit);

    if (!pmids.length) {
        return { articles: [], query, count: 0 };
    }

    // Rate limiting: wait 350ms between calls if no API key
    if (!process.env.NCBI_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 350));
    }

    const articles = await fetchAbstracts(pmids);

    return {
        articles,
        query,
        count: articles.length,
    };
}

export default {
    searchPubMed,
    fetchAbstracts,
    searchAndFetchAbstracts,
};
