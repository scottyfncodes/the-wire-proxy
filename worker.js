export default {
async fetch(request, env) {
if (request.method === “OPTIONS”) {
return corsResponse(null, 204, env);
}

```
const url = new URL(request.url);

if (request.method === "POST" && url.pathname === "/token") {
  return handleToken(request, env);
}

if (request.method === "GET" && url.pathname.startsWith("/api/")) {
  return handleAPI(request, url, env);
}

if (url.pathname === "/") {
  return corsResponse(JSON.stringify({ status: "THE WIRE proxy online", version: "2.0" }), 200, env);
}

return corsResponse(JSON.stringify({ error: "Not found" }), 404, env);
```

}
};

async function handleToken(request, env) {
let body;
try {
body = await request.json();
} catch {
return corsResponse(JSON.stringify({ error: “Invalid JSON body” }), 400, env);
}

const { code, refresh_token, grant_type } = body;

if (!grant_type) {
return corsResponse(JSON.stringify({ error: “grant_type required” }), 400, env);
}

const params = new URLSearchParams({ grant_type: grant_type, redirect_uri: “oob” });
if (grant_type === “authorization_code” && code) params.set(“code”, code);
if (grant_type === “refresh_token” && refresh_token) params.set(“refresh_token”, refresh_token);

const credentials = btoa(env.YAHOO_CLIENT_ID + “:” + env.YAHOO_CLIENT_SECRET);

let yahooResp;
try {
yahooResp = await fetch(“https://api.login.yahoo.com/oauth2/get_token”, {
method: “POST”,
headers: {
“Content-Type”: “application/x-www-form-urlencoded”,
“Authorization”: “Basic “ + credentials
},
body: params.toString()
});
} catch (e) {
return corsResponse(JSON.stringify({ error: “Failed to reach Yahoo”, detail: e.message }), 502, env);
}

const data = await yahooResp.text();
return corsResponse(data, yahooResp.status, env, {
“Content-Type”: yahooResp.headers.get(“Content-Type”) || “application/json”
});
}

async function handleAPI(request, url, env) {
const yahooPath = url.pathname.replace(/^/api/, “”);
const yahooQuery = url.search;
const yahooURL = “https://fantasysports.yahooapis.com/fantasy/v2” + yahooPath + yahooQuery;

const authHeader = request.headers.get(“Authorization”);
if (!authHeader) {
return corsResponse(JSON.stringify({ error: “Authorization header required” }), 401, env);
}

let yahooResp;
try {
yahooResp = await fetch(yahooURL, {
method: “GET”,
headers: {
“Authorization”: authHeader,
“Accept”: “application/json”
}
});
} catch (e) {
return corsResponse(JSON.stringify({ error: “Failed to reach Yahoo API”, detail: e.message }), 502, env);
}

const data = await yahooResp.text();
return corsResponse(data, yahooResp.status, env, {
“Content-Type”: yahooResp.headers.get(“Content-Type”) || “application/json”
});
}

function corsResponse(body, status, env, extraHeaders) {
if (!extraHeaders) extraHeaders = {};
const origin = env.ALLOWED_ORIGIN || “*”;
const headers = {
“Access-Control-Allow-Origin”: origin,
“Access-Control-Allow-Methods”: “GET, POST, OPTIONS”,
“Access-Control-Allow-Headers”: “Content-Type, Authorization”,
“Access-Control-Max-Age”: “86400”
};
const allHeaders = Object.assign({}, headers, extraHeaders);
return new Response(body, { status: status, headers: allHeaders });
}
