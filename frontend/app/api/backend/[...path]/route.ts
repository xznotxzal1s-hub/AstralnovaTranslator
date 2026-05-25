import { NextRequest, NextResponse } from "next/server";

const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ??
  "http://localhost:8000";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function buildTargetUrl(pathSegments: string[], search: string) {
  const safePath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = new URL(`/${safePath}`, INTERNAL_API_BASE_URL);
  targetUrl.search = search;
  return targetUrl;
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  return headers;
}

function copyResponseHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  headers.delete("content-encoding");
  return headers;
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(path, request.nextUrl.search);
  const canHaveBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: copyRequestHeaders(request),
    body: canHaveBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: copyResponseHeaders(response),
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
