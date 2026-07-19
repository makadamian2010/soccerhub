export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || !url.pathname.split("/").pop().includes(".")) {
      url.pathname = "/index.html";
    }
    const response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status !== 404) return response;
    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
};
