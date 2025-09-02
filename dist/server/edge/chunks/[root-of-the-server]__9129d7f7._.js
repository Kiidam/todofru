(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__9129d7f7._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/TodoFru4/todofru/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/TodoFru4/todofru/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/TodoFru4/todofru/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2d$auth$2f$jwt$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/TodoFru4/todofru/node_modules/next-auth/jwt/index.js [middleware-edge] (ecmascript)");
;
;
// Rutas que no requieren autenticación
const publicRoutes = [
    '/login',
    '/api/auth'
];
// Rutas que requieren roles específicos
const roleProtectedRoutes = {
    '/admin': [
        'ADMIN'
    ],
    '/inventarios': [
        'ADMIN',
        'INVENTORY_MANAGER'
    ],
    '/facturacion': [
        'ADMIN',
        'SALES_MANAGER'
    ]
};
async function middleware(request) {
    const { pathname } = request.nextUrl;
    // Verificar si es una ruta pública
    if (publicRoutes.some((route)=>pathname.startsWith(route))) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Verificar si es un archivo estático o API (excepto auth)
    if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/api') || pathname.includes('.') // Archivos estáticos como .jpg, .css, etc.
    ) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Obtener el token de sesión
    const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2d$auth$2f$jwt$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getToken"])({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });
    // Si no hay token, redirigir al login
    if (!token) {
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(request.url));
        return __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url);
    }
    // Verificar permisos basados en roles para rutas protegidas
    for (const [route, roles] of Object.entries(roleProtectedRoutes)){
        if (pathname.startsWith(route) && !roles.includes(token.role)) {
            // Si el usuario no tiene el rol requerido, redirigir al dashboard
            return __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL('/dashboard', request.url));
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$TodoFru4$2f$todofru$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        /*
     * Coincide con todas las rutas excepto:
     * 1. /api/auth (NextAuth.js endpoints)
     * 2. /_next (Next.js internals)
     * 3. /static (archivos estáticos)
     * 4. Todos los archivos estáticos en la carpeta public
     */ '/((?!api/auth|_next|static|.*\..*|favicon.ico).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__9129d7f7._.js.map