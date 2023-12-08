/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import fs from "fs";

const isDev = process.env["DFX_NETWORK"] !== "ic";

type Network = "ic" | "local";

interface CanisterIds {
    [key: string]: { [key in Network]: string };
}

let canisterIds: CanisterIds = {};
try {
    canisterIds = JSON.parse(
        fs
            .readFileSync(
                isDev ? ".dfx/local/canister_ids.json" : "./canister_ids.json"
            )
            .toString()
    );
} catch (e) {
    console.error("\n⚠️  Before starting the dev server run: dfx deploy\n\n");
}

// Generate canister ids, required by the generated canister code in .dfx/local/canisters/*
// This strange way of JSON.stringifying the value is required by vite
const canisterDefinitions = Object.entries(canisterIds).reduce(
    (acc, [key, val]) => ({
        ...acc,
        [`process.env.CANISTER_ID_${key.toUpperCase()}`]: isDev
            ? JSON.stringify(val.local)
            : JSON.stringify(val.ic),
    }),
    {}
);

console.log(canisterDefinitions);

// See guide on how to configure Vite at:
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), svgr()],
    root: "src",
    build: {
        target: "es2020",
        outDir: "../dist",
    },
    server: {
        host: true,
        fs: {
            allow: ["."],
        },
        proxy: {
            // This proxies all http requests made to /api to our running dfx instance
            "/api": {
                target: `http://127.0.0.1:4943`,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, "/api"),
            },
        },
    },
    define: {
        // Here we can define global constants
        // This is required for now because the code generated by dfx relies on process.env being set
        ...canisterDefinitions,
        "process.env.NODE_ENV": JSON.stringify(
            isDev ? "development" : "production"
        ),
        "process.env.DFX_NETWORK": JSON.stringify(isDev ? "local" : "ic"),
        global: "globalThis",
    },
});