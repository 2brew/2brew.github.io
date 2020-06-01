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
 * @param {String} type
 */
export async function remote(endpoint, options={}, {set}, type) {
  set({[type]: null, error: null, isFetching: true});
  const result = await requestEndpoint(endpoint, options);
  if (result.error) {
    set({[type]: null, error: result.error, isFetching: false});
  } else {
    set({[type]: result.data, error: null, isFetching: false});
  }
  return result;
}

/**
 * Remote data template
 *
 * @returns {Object}
 */
export function createRemoteData() {
  return {
    aeropress: null,
    'v_60': null,
    moka: null,
    error: null,
    isFetching: true
  };
}
