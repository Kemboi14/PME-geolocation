export default {
  root: "./www",
  base: "/",
  publicDir: "./public",
  server: {
    port: 3001,
    open: true,
    cors: true,
    proxy: {
      "/api": {
        target: "https://ke.erpproject.online",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true
  }
};
