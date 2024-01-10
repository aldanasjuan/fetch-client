
// import { goto } from '$app/navigation'; // if you are using redirects after logout
import { writable, get as getStoreValue } from 'svelte/store';
import { browser } from '$app/environment';
import { API_URL } from '$lib/env'; // change this to wherever your variables come from
const localKey = 'my_local_storage_key';
let jwt;
const token = writable(null);
export const ready = writable(false);
export const session = writable(null);
export const userData = writable(null);
export const adminCampus = writable(null);


if (browser) {
	startSession();
}

function startSession() {
	let local = window.localStorage.getItem(localKey);
	if (local) {
		token.set(local);
	}
	token.subscribe((v) => {
		if (!v) {
			window.localStorage.removeItem(localKey);
			session.set(null);
			userData.set(null);
			jwt = null;
		} else {
			jwt = v;
			window.localStorage.setItem(localKey, jwt);
			let { data, error } = parseToken(jwt);
			if (!error && data) {
				session.set(data);
			}
		}
	});

	ready.set(true);
}


function request(method = 'GET') {
	if (method.toLowerCase() === 'get') {
		return async function (path = '') {
			try {
				const options = {};
				if (jwt) {
					options.headers = {
						authorization: jwt
					};
				}
				let res = await fetch(`${API_URL}${path}`, options);
				if (res.status === 401 && getStoreValue(token)) {
					token.set(null);
					// goto('/login'); // add this if you want automatic redirection when user is logged out
				}
				let t = res.headers.get('Authorization');
				if (t) {
					token.set(t);
				}
				return res;
			} catch (error) {
				return { json: () => error, text: () => error, ok: false, status: 500, error };
			}
		};
	}

	return async function (path = '', data) {
		try {
			const options = {
				method: method,
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify(data)
			};
			if (jwt) {
				options.headers.authorization = jwt;
			}
			let res = await fetch(`${API_URL}${path}`, options);
			if (res.status === 401 && getStoreValue(token)) {
				token.set(null);
				// goto('/login');  // add this if you want automatic redirection when user is logged out
			}
			let t = res.headers.get('Authorization');
			if (t) {
				token.set(t);
			}
			return res;
		} catch (error) {
			return { json: () => error, text: () => error, ok: false, status: 500, error };
		}
	};
}

export function parseToken(token) {
	try {
		let data = JSON.parse(atob(token.split('.')[1]));
		return { data };
	} catch (error) {
		return { error };
	}
}

export async function getUserData() {
	let res = await get('/users');
	if (res.status === 200) {
		let data = await res.json();
		userData.set(data);
		return { result: getStoreValue(userData) };
	} else {
		return { error: await res.text(), status: res.status };
	}
}

export const get = request('GET');
export const post = request('POST');
export const put = request('PUT');
export const patch = request('PATCH');
export const del = request('DELETE');

export async function clearSession() {
	token.set(null);
}

export async function refreshUserData() {
	let res = await get('/users');
	if (res.ok) {
		const data = await res.json();
		userData.set(data);
		return data;
	} else {
		return null;
	}
}
