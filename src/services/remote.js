/**
 * Universal fetch wrapper
 * @param {String} endpoint
 * @param {Object} options
 *
 * @returns {Object}
 */
export async function requestEndpoint(endpoint, options={}) {
  try {
    const response = await window.fetch(endpoint, {
      headers: {'Content-Type': 'application/json'},
      ...options
    });
    const data = await response.json();
    if (response.ok) {
      return {data};
    } else {
      return {error: {...data, response}};
    }
  } catch (e) {
    return {error: e};
  }
}

/**
 * Simplest solution for store
 * @param {String} endpoint
 * @param {Object} options
 * @param {Object} store
 */
export async function remote(endpoint, options={}, {set}) {
  const result = await requestEndpoint(endpoint, options);
  if (result.error) {
    set({value: null, error: result.error, isFetching: false});
  } else {
    set({value: result.data, error: null, isFetching: false});
  }
}

/**
 * Remote data template
 *
 * @returns {Object}
 */
export function createRemoteData() {
  return {
    value: null,
    error: null,
    isFetching: true
  };
}
