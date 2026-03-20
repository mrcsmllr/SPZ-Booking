/** @type {import('next').NextConfig} */
const nextConfig = {
  // Erlaubt Einbindung als iFrame
  async headers() {
    return [
      {
        source: "/buchen/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
