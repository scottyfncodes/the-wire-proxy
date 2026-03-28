export default {
async fetch(request, env) {
if (request.method === `OPTIONS`) {
return cors(null, 204, env);
}
const url = new URL(request.url);
if (request.method === `POST` && url.pathname === `/token`) {
return handleToken(request, env);
}
if (request.method === `GET` && url.pathname.startsWith(`/api/`)) {
return handleAPI(request, url, env);
}
return cors(JSON.stringify({status:`ok`}), 200, env);
}
};

async function handleToken(request, env) {
let body;
try { body = await request.json(); }
catch { return cors(JSON.stringify({error:`bad json`}), 400, env); }
const {code, refresh_token, grant_type} = body;
const params = new URLSearchParams({grant_type, redirect_uri:`oob`});
if (code) params.set(`code`, code);
if (refresh_token) params.set(`refresh_token`, refresh_token);
const creds = btoa(env.YAHOO_CLIENT_ID + `:` + env.YAHOO_CLIENT_SECRET);
const resp = await fetch(`https://api.login.yahoo.com/oauth2/get_token`, {
method: `POST`,
headers: {
[`Content-Type`]: `application/x-www-form-urlencoded`,
[`Authorization`]: `Basic ` + creds
},
body: params.toString()
});
const data = await resp.text();
return cors(data, resp.status, env, {[`Content-Type`]: resp.headers.get(`Content-Type`) || `application/json`});
}

async function handleAPI(request, url, env) {
const path = url.pathname.replace(/^/api/, ``);
const yahooURL = `https://fantasysports.yahooapis.com/fantasy/v2` + path + url.search;
const auth = request.headers.get(`Authorization`);
if (!auth) return cors(JSON.stringify({error:`no auth`}), 401, env);
const resp = await fetch(yahooURL, {
headers: {[`Authorization`]: auth, [`Accept`]: `application/json`}
});
const data = await resp.text();
return cors(data, resp.status, env, {[`Content-Type`]: resp.headers.get(`Content-Type`) || `application/json`});
}

function cors(body, status, env, extra) {
const h = Object.assign({
[`Access-Control-Allow-Origin`]: `*`,
[`Access-Control-Allow-Methods`]: `GET, POST, OPTIONS`,
[`Access-Control-Allow-Headers`]: `Content-Type, Authorization`
}, extra || {});
return new Response(body, {status, headers: h});
}
