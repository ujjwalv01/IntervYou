/** @type {import('next').NextConfig} */
const nextConfig = {
  // The repo has lockfiles at the root and in client/; tell Turbopack this folder is the app root.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
