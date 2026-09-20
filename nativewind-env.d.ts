/// <reference types="nativewind/types" />

// Metro resolves `global.css` through the NativeWind transformer; TypeScript needs to be
// told the side-effect import is legal.
declare module '*.css';
