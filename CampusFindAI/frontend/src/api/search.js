import { apiRequest } from './client';

/**
 * POST /api/search/semantic
 *
 * @param {string} query  Natural-language search query
 * @returns {Promise<SemanticSearchResponse>}
 */
export function semanticSearch(query) {
  return apiRequest('/search/semantic', {
    method: 'POST',
    body: { query },
  });
}

/**
 * @typedef {Object} SemanticQuery
 * @property {string|null} intent
 * @property {string|null} item
 * @property {string|null} category
 * @property {string|null} color
 * @property {string|null} location
 * @property {string|null} dateFrom
 * @property {string|null} dateTo
 * @property {string[]}    keywords
 * @property {number}      confidence
 */

/**
 * @typedef {Object} SemanticSearchItem
 * @property {string}      id
 * @property {'lost'|'found'} type
 * @property {string}      title
 * @property {string|null} description
 * @property {string|null} categoryName
 * @property {string|null} locationName
 * @property {string|null} date
 * @property {string|null} status
 * @property {string[]}    imageUrls
 * @property {number}      relevanceScore
 */

/**
 * @typedef {Object} SemanticSearchResponse
 * @property {string}              query
 * @property {SemanticQuery|null}  interpretedQuery
 * @property {boolean}             aiInterpreted
 * @property {SemanticSearchItem[]} results
 * @property {number}              totalResults
 * @property {string}              searchId
 * @property {number}              processingMs
 */
